from __future__ import annotations

import os
import re
from pathlib import Path

import pytest
from playwright.sync_api import Browser, Page, expect, sync_playwright

BASE_URL = os.getenv("QA_BASE_URL", "http://127.0.0.1:5173")
API_URL = os.getenv("QA_API_URL", "http://127.0.0.1:8000")
ADMIN_EMAIL = os.getenv("QA_ADMIN_EMAIL", "qa-admin@example.com")
ADMIN_PASSWORD = os.getenv("QA_ADMIN_PASSWORD", "QaAdmin!12345")
ARTIFACT_DIR = Path(os.getenv("QA_ARTIFACT_DIR", "qa-artifacts"))
ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)


def snap(page: Page, name: str) -> None:
    path = ARTIFACT_DIR / f"{name}.png"
    page.screenshot(path=str(path), full_page=True)
    print(f"[QA] screenshot: {path}")


def login(page: Page, email: str, password: str) -> None:
    page.goto(f"{BASE_URL}/login")
    page.get_by_label("Email").fill(email)
    page.get_by_label("Password").fill(password)
    page.get_by_role("button", name="Sign in").click()
    expect(page).to_have_url(f"{BASE_URL}/app", timeout=15_000)
    expect(page.get_by_text("LIVE", exact=True)).to_be_visible(timeout=15_000)
    expect(page.locator("#card-metric-cpu")).to_be_visible(timeout=10_000)


def logout(page: Page) -> None:
    page.get_by_role("button", name="Sign out").click()
    expect(page).to_have_url(f"{BASE_URL}/", timeout=10_000)


@pytest.mark.e2e
def test_full_real_user_journey() -> None:
    with sync_playwright() as playwright:
        browser: Browser = playwright.chromium.launch(headless=True)
        admin_ctx = browser.new_context(viewport={"width": 1440, "height": 1000})
        page = admin_ctx.new_page()

        console_errors: list[str] = []
        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
        page.on("pageerror", lambda exc: console_errors.append(str(exc)))

        try:
            # 1) Public first-visit journey.
            print("[QA] 1. Homepage")
            page.goto(BASE_URL)
            expect(page.get_by_role("heading", level=1)).to_contain_text(
                "Know what your infrastructure is doing"
            )
            expect(page.get_by_role("link", name="Open dashboard")).to_be_visible()
            expect(page.get_by_role("link", name="Explore the dashboard")).to_be_visible()
            page.get_by_role("link", name="Explore the dashboard").click()
            expect(page).to_have_url(f"{BASE_URL}/login")
            snap(page, "01-home-to-login")

            # 2) Authentication and browser validation.
            print("[QA] 2. Login validation + successful authentication")
            page.get_by_label("Email").fill(ADMIN_EMAIL)
            page.get_by_role("button", name="Sign in").click()
            expect(page).to_have_url(f"{BASE_URL}/login")
            page.get_by_label("Password").fill("wrong-password")
            page.get_by_role("button", name="Sign in").click()
            expect(page.get_by_role("alert")).to_contain_text("Incorrect email or password")
            login(page, ADMIN_EMAIL, ADMIN_PASSWORD)
            snap(page, "02-admin-login")

            # 3) Dashboard and live telemetry.
            print("[QA] 3. Dashboard")
            for card in (
                "card-metric-cpu",
                "card-metric-memory",
                "card-metric-temp",
                "card-metric-network",
                "card-metric-rps",
                "card-metric-latency",
                "card-metric-errors",
            ):
                expect(page.locator(f"#{card}")).to_be_visible()
            seq1 = page.locator("text=/Seq:/").inner_text()
            page.wait_for_timeout(1500)
            seq2 = page.locator("text=/Seq:/").inner_text()
            assert seq1 != seq2, "Live sequence did not advance"
            expect(page.get_by_text("Statistics", exact=False)).to_be_visible()
            expect(page.get_by_text("Historical", exact=False)).to_be_visible()
            snap(page, "03-dashboard-live")

            # 4) Pause/resume, rate, and reset cancellation.
            print("[QA] 4. Simulation controls")
            page.locator("#btn-play-pause").click()
            expect(page.locator("#btn-play-pause")).to_contain_text("Resume Stream", timeout=10_000)
            paused_seq = page.locator("text=/Seq:/").inner_text()
            page.wait_for_timeout(1200)
            assert page.locator("text=/Seq:/").inner_text() == paused_seq
            page.locator("#btn-play-pause").click()
            expect(page.locator("#btn-play-pause")).to_contain_text("Pause Stream", timeout=10_000)

            page.get_by_role("button", name="50 Hz", exact=True).click()
            expect(page.get_by_text("Current: 50 Hz", exact=True)).to_be_visible(timeout=10_000)
            page.get_by_role("button", name="1 Hz", exact=True).click()
            expect(page.get_by_text("Current: 1 Hz", exact=True)).to_be_visible(timeout=10_000)
            page.locator("#btn-reset-simulation").click()
            expect(page.get_by_text("Reset Simulation State?", exact=True)).to_be_visible()
            page.get_by_role("button", name="Cancel", exact=True).click()
            expect(page.get_by_text("Reset Simulation State?", exact=True)).to_have_count(0)
            page.get_by_role("button", name="10 Hz", exact=True).click()
            snap(page, "04-simulation-controls")

            # 5) Trigger anomaly, alert detection, acknowledgement, persistence.
            print("[QA] 5. Anomaly -> alert lifecycle")
            page.locator("#select-anomaly-metric").select_option("cpu")
            page.locator("#select-anomaly-intensity").select_option("3.5")
            page.locator("#select-anomaly-duration").select_option("8.0")
            page.locator("#btn-trigger-anomaly").click()
            expect(page.get_by_text("Active: CPU", exact=True)).to_be_visible(timeout=10_000)

            page.get_by_role("link", name="Alerts", exact=True).click()
            expect(page).to_have_url(f"{BASE_URL}/app/alerts")
            page.get_by_role("checkbox").check()
            expect(page.get_by_role("checkbox")).to_be_checked()
            # Alert generation is asynchronous; keep the user flow on the alert page.
            expect(
                page.locator("div").filter(has_text="Acknowledge").first
            ).to_be_visible(timeout=25_000)
            alert_row = page.locator("div").filter(has_text="Acknowledge").first
            alert_row.get_by_role("button", name="Acknowledge").click()
            expect(alert_row.get_by_text("Acknowledged", exact=True)).to_be_visible(timeout=10_000)
            page.get_by_role("button", name="Refresh").click()
            expect(page.get_by_text("Acknowledged", exact=True)).to_be_visible(timeout=10_000)
            snap(page, "05-alert-lifecycle")

            # 6) Analytics.
            print("[QA] 6. Analytics")
            page.get_by_role("link", name="Analytics", exact=True).click()
            expect(page).to_have_url(f"{BASE_URL}/app/analytics")
            expect(page.get_by_role("heading", level=1)).to_contain_text("Analytics")
            expect(page.get_by_text("Metrics tracked", exact=True)).to_be_visible()
            snap(page, "06-analytics")

            # 7) Hosts CRUD and persistence-sensitive operations.
            print("[QA] 7. Hosts")
            page.get_by_role("link", name="Hosts", exact=True).click()
            expect(page.get_by_role("button", name="Add host")).to_be_visible()
            host_name = "qa-e2e-host"
            page.get_by_placeholder("api-prod-01").fill(host_name)
            page.get_by_placeholder("production").fill("staging")
            page.get_by_role("button", name="Add host").click()
            expect(page.get_by_text(host_name, exact=True)).to_be_visible(timeout=10_000)

            row = page.locator("div").filter(has_text=host_name).filter(
                has=page.get_by_role("button", name="Edit")
            ).first
            row.get_by_role("button", name="Edit").click()
            page.get_by_label("Host name").fill(f"{host_name}-updated")
            page.get_by_label("Host environment").fill("qa")
            row.get_by_role("button", name="Save").click()
            expect(page.get_by_text(f"{host_name}-updated", exact=True)).to_be_visible(timeout=10_000)

            row = page.locator("div").filter(has_text=f"{host_name}-updated").filter(
                has=page.get_by_role("button", name="Deactivate")
            ).first
            row.get_by_role("button", name="Deactivate").click()
            expect(row.get_by_text("Inactive", exact=True)).to_be_visible(timeout=10_000)
            row.get_by_role("button", name="Activate").click()
            expect(row.get_by_text("Active", exact=True)).to_be_visible(timeout=10_000)

            page.once("dialog", lambda dialog: dialog.accept())
            row.get_by_role("button", name="Delete").click()
            expect(page.get_by_text(f"{host_name}-updated", exact=True)).to_have_count(0, timeout=10_000)
            snap(page, "07-hosts")

            # 8) Admin creates accounts.
            print("[QA] 8. Administration")
            page.get_by_role("link", name="Administration", exact=True).click()
            expect(page.get_by_role("heading", level=1)).to_contain_text("Access management")
            accounts = {
                "viewer": ("qa-viewer@example.com", "Viewer!12345"),
                "operator": ("qa-operator@example.com", "Operator!12345"),
                "admin2": ("qa-admin2@example.com", "AdminTwo!12345"),
            }
            for role, (email, password) in accounts.items():
                page.get_by_placeholder("operator@company.com").fill(email)
                page.get_by_placeholder("Minimum 8 characters").fill(password)
                page.locator("select").first.select_option("admin" if role == "admin2" else role)
                page.get_by_role("button", name="Create", exact=True).click()
                expect(page.get_by_text(email, exact=True)).to_be_visible(timeout=10_000)

            viewer_row = page.locator("div").filter(has_text=accounts["viewer"][0]).filter(
                has=page.get_by_role("button", name="Role")
            ).first
            viewer_row.get_by_role("button", name="Role").click()
            viewer_row.get_by_role("combobox").last.select_option("operator")
            viewer_row.get_by_role("button", name="Save").click()
            expect(viewer_row.get_by_text("operator", exact=True)).to_be_visible(timeout=10_000)
            viewer_row.get_by_role("button", name="Role").click()
            viewer_row.get_by_role("combobox").last.select_option("viewer")
            viewer_row.get_by_role("button", name="Save").click()
            expect(viewer_row.get_by_text("viewer", exact=True)).to_be_visible(timeout=10_000)

            viewer_row.get_by_role("button", name="Reset password").click()
            viewer_row.get_by_placeholder("New password, minimum 8 characters").fill("ViewerNew!12345")
            viewer_row.get_by_role("button", name="Reset").click()
            expect(page.get_by_text("Password reset successfully.", exact=True)).to_be_visible(
                timeout=10_000
            )

            current_row = page.locator("div").filter(has_text=ADMIN_EMAIL).filter(
                has=page.get_by_role("button", name="Deactivate")
            ).first
            expect(current_row.get_by_role("button", name=re.compile("Deactivate"))).to_be_disabled()
            snap(page, "08-administration")

            # 9) Viewer: read-only UX plus backend authorization.
            print("[QA] 9. Viewer")
            viewer_ctx = browser.new_context(viewport={"width": 1440, "height": 1000})
            viewer = viewer_ctx.new_page()
            login(viewer, *accounts["viewer"])
            expect(viewer.get_by_role("link", name="Administration", exact=True)).to_have_count(0)
            expect(viewer.get_by_text("Telemetry Simulation Engine", exact=True)).to_have_count(0)
            expect(viewer.get_by_role("button", name="Add host")).to_have_count(0)
            viewer.get_by_role("link", name="Alerts", exact=True).click()
            expect(viewer.get_by_role("button", name="Acknowledge")).to_have_count(0)
            viewer.goto(f"{BASE_URL}/app/admin")
            expect(viewer.get_by_role("heading", level=1)).to_contain_text("Page not found")
            viewer_status = viewer.evaluate(
                """async () => {
                    const token = localStorage.getItem('telemetry_access_token');
                    const response = await fetch('%s/api/simulation/pause', {
                      method: 'POST',
                      headers: { Authorization: 'Bearer ' + token }
                    });
                    return response.status;
                }"""
                % API_URL
            )
            assert viewer_status == 403, f"Viewer simulation endpoint returned {viewer_status}"
            logout(viewer)
            viewer.close()
            viewer_ctx.close()

            # 10) Operator: control simulation but no host/user administration.
            print("[QA] 10. Operator")
            operator_ctx = browser.new_context(viewport={"width": 1440, "height": 1000})
            operator = operator_ctx.new_page()
            login(operator, *accounts["operator"])
            expect(operator.get_by_text("Telemetry Simulation Engine", exact=True)).to_be_visible()
            expect(operator.get_by_role("button", name="Add host")).to_have_count(0)
            operator.locator("#btn-play-pause").click()
            expect(operator.locator("#btn-play-pause")).to_contain_text("Resume Stream", timeout=10_000)
            operator.locator("#btn-play-pause").click()
            expect(operator.locator("#btn-play-pause")).to_contain_text("Pause Stream", timeout=10_000)
            operator.close()
            operator_ctx.close()

            # 11) Admin2 disables the original admin; original session must become unauthorized.
            print("[QA] 11. Cross-session deactivation")
            admin2_ctx = browser.new_context(viewport={"width": 1440, "height": 1000})
            admin2 = admin2_ctx.new_page()
            login(admin2, *accounts["admin2"])
            admin2.get_by_role("link", name="Administration", exact=True).click()
            admin_row = admin2.locator("div").filter(has_text=ADMIN_EMAIL).filter(
                has=admin2.get_by_role("button", name="Deactivate")
            ).first
            admin_row.get_by_role("button", name="Deactivate").click()
            expect(admin_row.get_by_text("Inactive", exact=True)).to_be_visible(timeout=10_000)

            page.goto(f"{BASE_URL}/app")
            expect(page).to_have_url(f"{BASE_URL}/login", timeout=15_000)

            admin2.get_by_role("button", name="Activate").click()
            expect(admin_row.get_by_text("Active", exact=True)).to_be_visible(timeout=10_000)
            admin2.close()
            admin2_ctx.close()

            # 12) Settings password change + logout/direct URL guard.
            print("[QA] 12. Settings + logout")
            login(page, ADMIN_EMAIL, ADMIN_PASSWORD)
            page.get_by_role("link", name="Settings", exact=True).click()
            expect(page.get_by_role("heading", level=1)).to_contain_text("Settings")
            page.get_by_placeholder("Current password").fill(ADMIN_PASSWORD)
            page.get_by_placeholder("New password").fill("QaAdminNew!12345")
            page.get_by_placeholder("Confirm new password").fill("QaAdminNew!12345")
            page.get_by_role("button", name="Update password").click()
            expect(page.get_by_text("Password changed successfully.", exact=True)).to_be_visible(
                timeout=10_000
            )
            logout(page)
            page.goto(f"{BASE_URL}/app")
            expect(page).to_have_url(f"{BASE_URL}/login", timeout=10_000)

            # New password works.
            login(page, ADMIN_EMAIL, "QaAdminNew!12345")
            snap(page, "12-settings-logout")

            # 13) Responsive/mobile navigation.
            print("[QA] 13. Mobile navigation")
            mobile_ctx = browser.new_context(viewport={"width": 390, "height": 844})
            mobile = mobile_ctx.new_page()
            login(mobile, ADMIN_EMAIL, "QaAdminNew!12345")
            mobile.locator("div.h-16 button").first.click()
            expect(mobile.get_by_role("link", name="Overview", exact=True)).to_be_visible(timeout=5_000)
            expect(mobile.get_by_role("link", name="Administration", exact=True)).to_be_visible(timeout=5_000)
            mobile.get_by_role("link", name="Administration", exact=True).click()
            expect(mobile).to_have_url(f"{BASE_URL}/app/admin")
            mobile.close()
            mobile_ctx.close()

            # 14) Final browser health signal.
            print("[QA] 14. Console health")
            bad = [
                message for message in console_errors
                if "favicon" not in message.lower()
                and "extension" not in message.lower()
            ]
            assert not bad, "Browser console errors: " + repr(bad[:10])
            snap(page, "14-final")

        except Exception:
            try:
                snap(page, "failure")
            finally:
                page.close()
                admin_ctx.close()
                browser.close()
            raise
        else:
            page.close()
            admin_ctx.close()
            browser.close()
