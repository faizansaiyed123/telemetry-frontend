from __future__ import annotations

import re

from datetime import datetime, timezone

import json
import os
import threading
import time
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from uuid import uuid4

import pytest
from playwright.sync_api import Browser, Page, expect, sync_playwright

BASE_URL = os.getenv("QA_BASE_URL", "http://127.0.0.1:3000")
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


_UNSET = object()


def api_json(page: Page, method: str, path: str, payload=_UNSET) -> tuple[int, object]:
    has_payload = payload is not _UNSET
    return page.evaluate(
        """async ({apiUrl, method, path, hasPayload, payload}) => {
          const token = localStorage.getItem("telemetry_access_token");
          const response = await fetch(apiUrl + path, {
            method,
            headers: {
              ...(hasPayload ? {"Content-Type": "application/json"} : {}),
              Authorization: "Bearer " + token,
            },
            body: hasPayload ? JSON.stringify(payload) : undefined,
          });
          const raw = await response.text();
          let body = null;
          try { body = raw ? JSON.parse(raw) : null; } catch { body = raw; }
          return [response.status, body];
        }""",
        {"apiUrl": API_URL, "method": method, "path": path, "hasPayload": has_payload, "payload": None if not has_payload else payload},
    )


def api_ingest(page: Page, secret: str, path: str, payload: object) -> tuple[int, object]:
    return page.evaluate(
        """async ({apiUrl, secret, path, payload}) => {
          const response = await fetch(apiUrl + path, {
            method: "POST",
            headers: {"Content-Type": "application/json", "X-Telemetry-Key": secret},
            body: JSON.stringify(payload),
          });
          let body = null;
          try { body = await response.json(); } catch { body = await response.text(); }
          return [response.status, body];
        }""",
        {"apiUrl": API_URL, "secret": secret, "path": path, "payload": payload},
    )


def api_public(page: Page, method: str, path: str, payload=_UNSET) -> tuple[int, object]:
    has_payload = payload is not _UNSET
    return page.evaluate(
        """async ({apiUrl, method, path, hasPayload, payload}) => {
          const response = await fetch(apiUrl + path, {
            method,
            headers: hasPayload ? {"Content-Type": "application/json"} : {},
            body: hasPayload ? JSON.stringify(payload) : undefined,
          });
          let body = null;
          try { body = await response.json(); } catch { body = await response.text(); }
          return [response.status, body];
        }""",
        {"apiUrl": API_URL, "method": method, "path": path, "hasPayload": has_payload, "payload": None if not has_payload else payload},
    )


def action_row(page: Page, text_value: str, button_name: str):
    matches = page.get_by_text(text_value, exact=True)
    for i in range(matches.count()):
        node = matches.nth(i)
        for depth in range(1, 9):
            container = node.locator("xpath=" + "/.." * depth)
            if container.get_by_role("button", name=button_name, exact=True).count() > 0:
                return container
    raise AssertionError(f"Could not locate an actionable row containing {text_value!r} with button {button_name!r}")


class WebhookCapture(BaseHTTPRequestHandler):
    received: list[dict] = []

    def do_POST(self):  # noqa: N802
        length = int(self.headers.get("content-length", "0"))
        body = self.rfile.read(length).decode("utf-8")
        type(self).received.append({
            "path": self.path,
            "body": body,
            "headers": {k: v for k, v in self.headers.items()},
        })
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"ok")

    def log_message(self, _format, *_args):
        return


@pytest.mark.e2e
def test_comprehensive_real_full_stack_walkthrough() -> None:
    receiver = HTTPServer(("127.0.0.1", 8787), WebhookCapture)
    receiver_thread = threading.Thread(target=receiver.serve_forever, daemon=True)
    receiver_thread.start()

    with sync_playwright() as playwright:
        browser: Browser = playwright.chromium.launch(headless=True)
        admin_ctx = browser.new_context(viewport={"width": 1440, "height": 1000})
        page = admin_ctx.new_page()
        console_errors: list[str] = []
        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
        page.on("pageerror", lambda exc: console_errors.append(str(exc)))

        suffix = uuid4().hex[:8]
        viewer_email = f"qa-viewer-{suffix}@example.com"
        operator_email = f"qa-operator-{suffix}@example.com"
        second_admin_email = f"qa-admin2-{suffix}@example.com"
        new_admin_password = f"QaAdminNew-{suffix}!"
        host_name = f"qa-host-{suffix}"
        service_a = f"qa-api-{suffix}"
        service_b = f"qa-db-{suffix}"
        rule_name = f"QA latency rule {suffix}"
        slo_name = f"QA SLO {suffix}"
        change_title = f"QA deployment {suffix}"
        synthetic_name = f"QA synthetic {suffix}"
        channel_name = f"QA webhook {suffix}"
        signup_email = f"qa-signup-{suffix}@example.com"
        signup_password = f"Signup!{suffix}12345"

        try:
            print("[QA] 01. Public entry + authentication validation")
            page.goto(BASE_URL)
            expect(page.get_by_role("heading", level=1)).to_contain_text("Know what your infrastructure is doing")
            snap(page, "00-home")

            page.get_by_role("link", name="Create account").first.click()
            expect(page).to_have_url(f"{BASE_URL}/signup")
            page.get_by_label("Email").fill(signup_email)
            page.get_by_placeholder("Minimum 8 characters").fill(signup_password)
            page.get_by_placeholder("Re-enter your password").fill("Mismatch!123456")
            page.get_by_role("button", name="Create account", exact=True).click()
            expect(page.get_by_role("alert")).to_contain_text("Passwords do not match")
            page.get_by_placeholder("Re-enter your password").fill(signup_password)
            page.get_by_role("button", name="Create account", exact=True).click()
            expect(page).to_have_url(f"{BASE_URL}/app", timeout=15_000)
            status, signup_me = api_json(page, "GET", "/api/auth/me")
            assert status == 200 and signup_me["email"] == signup_email and signup_me["role"] == "viewer"
            snap(page, "01-signup")
            page.get_by_role("button", name="Sign out", exact=True).click()
            expect(page).to_have_url(BASE_URL + "/")
            
            page.get_by_role("link", name="Sign in").first.click()
            expect(page).to_have_url(f"{BASE_URL}/login")
            page.get_by_label("Email").fill(ADMIN_EMAIL)
            page.get_by_label("Password").fill("wrong-password")
            page.get_by_role("button", name="Sign in").click()
            expect(page.get_by_role("alert")).to_contain_text("Incorrect email or password")
            login(page, ADMIN_EMAIL, ADMIN_PASSWORD)
            snap(page, "01-login")

            print("[QA] 02. Public readiness and authenticated identity")
            status, _ = api_public(page, "GET", "/health")
            assert status == 200
            status, ready = api_public(page, "GET", "/ready")
            assert status == 200 and isinstance(ready, dict)
            status, me = api_json(page, "GET", "/api/auth/me")
            assert status == 200 and me["email"] == ADMIN_EMAIL
            status, ws_token = api_json(page, "POST", "/api/auth/ws-token")
            assert status == 200 and ws_token["access_token"]

            print("[QA] 03. Dashboard live telemetry and simulation controls")
            for card_id in (
                "card-metric-cpu", "card-metric-memory", "card-metric-temp",
                "card-metric-network", "card-metric-rps", "card-metric-latency",
                "card-metric-errors",
            ):
                expect(page.locator(f"#{card_id}")).to_be_visible(timeout=10_000)
            seq1 = page.locator("#live-telemetry-sequence").inner_text()
            page.wait_for_timeout(1800)
            seq2 = page.locator("#live-telemetry-sequence").inner_text()
            assert seq1 != seq2
            page.locator("#btn-play-pause").click()
            expect(page.locator("#btn-play-pause")).to_contain_text("Resume Stream", timeout=10_000)
            paused = page.locator("#live-telemetry-sequence").inner_text()
            page.wait_for_timeout(1200)
            assert page.locator("#live-telemetry-sequence").inner_text() == paused
            page.locator("#btn-play-pause").click()
            expect(page.locator("#btn-play-pause")).to_contain_text("Pause Stream", timeout=10_000)
            page.get_by_role("button", name="50 Hz", exact=True).click()
            expect(page.get_by_text("Current: 50 Hz", exact=True)).to_be_visible()
            page.get_by_role("button", name="1 Hz", exact=True).click()
            expect(page.get_by_text("Current: 1 Hz", exact=True)).to_be_visible()
            page.locator("#btn-reset-simulation").click()
            expect(page.get_by_text("Reset Simulation State?", exact=True)).to_be_visible()
            page.get_by_role("button", name="Cancel", exact=True).click()
            page.get_by_role("button", name="10 Hz", exact=True).click()
            snap(page, "02-dashboard-simulation")

            print("[QA] 04. Analytics reads persisted telemetry")
            page.get_by_role("link", name="Analytics", exact=True).click()
            expect(page).to_have_url(f"{BASE_URL}/app/analytics")
            expect(page.get_by_role("heading", level=1)).to_contain_text("Queryable system history")
            expect(page.get_by_text("Stored samples", exact=True)).to_be_visible()
            stats_before = api_json(page, "GET", "/api/telemetry/stats")
            assert stats_before[0] == 200 and stats_before[1]["count"] > 0
            history = api_json(page, "GET", "/api/telemetry/history?limit=10")
            assert history[0] == 200 and len(history[1]["events"]) > 0
            snap(page, "03-analytics")

            print("[QA] 05. Host CRUD through UI with API read-back")
            page.get_by_role("link", name="Hosts", exact=True).click()
            expect(page.get_by_role("heading", level=1)).to_contain_text("Hosts")
            page.get_by_placeholder("api-prod-01").fill(host_name)
            page.get_by_placeholder("production").fill("qa")
            page.get_by_role("button", name="Add host", exact=True).click()
            expect(page.get_by_text(host_name, exact=True)).to_be_visible(timeout=10_000)
            _, hosts = api_json(page, "GET", "/api/hosts")
            created_host = next(h for h in hosts if h["name"] == host_name)
            host_id = created_host["id"]

            row = action_row(page, host_name, "Edit")
            row.get_by_role("button", name="Edit", exact=True).click()
            page.get_by_label("Host name").fill(host_name + "-updated")
            page.get_by_label("Host environment").fill("staging")
            page.get_by_role("button", name="Save", exact=True).click()
            expect(page.get_by_text(host_name + "-updated", exact=True)).to_be_visible(timeout=10_000)

            row = action_row(page, host_name + "-updated", "Deactivate")
            row.get_by_role("button", name="Deactivate", exact=True).click()
            expect(row.get_by_text("Inactive", exact=True).last).to_be_visible(timeout=10_000)
            status, hosts_after_toggle = api_json(page, "GET", "/api/hosts")
            assert status == 200
            toggled = next(h for h in hosts_after_toggle if h["id"] == host_id)
            assert toggled["is_active"] is False
            row.get_by_role("button", name="Activate", exact=True).click()
            expect(row.get_by_text("Active", exact=True).last).to_be_visible(timeout=10_000)

            page.get_by_role("link", name="Operations", exact=True).click()
            page.get_by_role("button", name="Agent access", exact=True).click()
            page.locator("select").first.select_option(host_id)
            page.get_by_placeholder("Windows telemetry agent").fill("browser-ingest-" + suffix)
            page.get_by_role("button", name="Create key", exact=True).click()
            expect(page.get_by_text("New agent secret", exact=True)).to_be_visible(timeout=10_000)
            secret = page.locator("div.font-mono").filter(has_text="tlm_").last.inner_text()
            assert secret.startswith("tlm_")
            event = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "sequence": 900000 + int(suffix[-4:], 16),
                "cpu": 47.0,
                "memory": 52.0,
                "temperature": 61.0,
                "network_mbps": 12.5,
                "requests_per_second": 42.0,
                "error_rate": 0.2,
                "latency_ms": 86.0,
            }
            status, ingest = api_ingest(page, secret, "/api/ingest/v1/telemetry", {"events": [event], "agent_version": "qa-browser"})
            assert status == 200 and ingest["accepted"] == 1 and ingest["deduplicated"] == 0
            status, duplicate = api_ingest(page, secret, "/api/ingest/v1/telemetry", {"events": [event], "agent_version": "qa-browser"})
            assert status == 200 and duplicate["accepted"] == 0 and duplicate["deduplicated"] == 1
            status, history = api_json(page, "GET", f"/api/telemetry/history?host_id={host_id}&limit=50")
            assert status == 200 and any(item["sequence"] == event["sequence"] and item["source"] == "agent" for item in history["events"])
            page.get_by_role("link", name="Hosts", exact=True).click()
            expect(page.get_by_text(host_name + "-updated", exact=True)).to_be_visible(timeout=10_000)
            host_row = page.locator("div.px-5.py-5").filter(has=page.get_by_text(host_name + "-updated", exact=True)).first
            expect(host_row.get_by_text(host_name + "-updated", exact=True)).to_be_visible(timeout=10_000)
            page.once("dialog", lambda dialog: dialog.accept())
            host_row.get_by_title("Delete host").click()
            expect(page.get_by_text(host_name + "-updated", exact=True)).to_have_count(0, timeout=10_000)
            status, hosts_after_delete = api_json(page, "GET", "/api/hosts")
            assert status == 200
            assert all(h["id"] != host_id for h in hosts_after_delete)
            snap(page, "04-hosts")

            print("[QA] 06. Stateful alert rule CRUD")
            page.get_by_role("link", name="Operations", exact=True).click()
            expect(page.get_by_role("heading", level=1)).to_contain_text("Production control plane")
            page.get_by_role("button", name="Alert rules", exact=True).click()
            page.get_by_placeholder("High latency").fill(rule_name)
            page.get_by_placeholder("Duration seconds").fill("2")
            page.get_by_placeholder("Cooldown seconds").fill("10")
            page.get_by_role("button", name="Create rule", exact=True).click()
            expect(page.get_by_text(rule_name, exact=True)).to_be_visible(timeout=10_000)
            status, rules = api_json(page, "GET", "/api/alert-rules")
            assert status == 200
            rule = next(r for r in rules if r["name"] == rule_name)
            rule_row = action_row(page, rule_name, "Edit")
            rule_row.get_by_role("button", name="Edit", exact=True).click()
            save_rule_button = page.get_by_role("button", name="Save changes", exact=True)
            rule_edit_row = save_rule_button.locator("xpath=../..")
            rule_edit_row.locator('input[type="number"]').nth(1).fill("3")
            save_rule_button.click()
            status, rules = api_json(page, "GET", "/api/alert-rules")
            assert status == 200
            assert next(r for r in rules if r["id"] == rule["id"])["duration_seconds"] == 3
            rule_row = action_row(page, rule_name, "Pause")
            rule_row.get_by_role("button", name="Pause", exact=True).click()
            rule_row = action_row(page, rule_name, "Enable")
            rule_row.get_by_role("button", name="Enable", exact=True).click()
            page.once("dialog", lambda dialog: dialog.accept())
            rule_row = action_row(page, rule_name, "Delete")
            rule_row.get_by_role("button", name="Delete", exact=True).click()
            status, rules = api_json(page, "GET", "/api/alert-rules")
            assert status == 200 and all(r["id"] != rule["id"] for r in rules)
            snap(page, "05-alert-rules")

            print("[QA] 07. Anomaly -> alert -> incident -> acknowledgement")
            page.goto(f"{BASE_URL}/app")
            page.locator("#select-anomaly-metric").select_option("cpu")
            page.locator("#select-anomaly-intensity").select_option("3.5")
            page.locator("#select-anomaly-duration").select_option("8.0")
            page.locator("#btn-trigger-anomaly").click()
            expect(page.get_by_text("Active: CPU", exact=True)).to_be_visible(timeout=15_000)
            page.get_by_role("link", name="Alerts", exact=True).click()
            page.get_by_role("checkbox").check()
            acknowledge_button = page.get_by_role("button", name="Acknowledge", exact=True).first
            expect(acknowledge_button).to_be_visible(timeout=25_000)
            acknowledge_button.click()
            expect(page.get_by_text("Acknowledged", exact=True).first).to_be_visible(timeout=10_000)
            status, alerts = api_json(page, "GET", "/api/alerts")
            assert status == 200 and len(alerts["alerts"]) > 0
            page.get_by_role("link", name="Incidents", exact=True).click()
            expect(page.get_by_role("heading", level=1)).to_contain_text("Incident timeline")
            status, incidents = api_json(page, "GET", "/api/incidents")
            assert status == 200
            if incidents:
                incident = incidents[0]
                status, evidence = api_json(page, "GET", f"/api/incidents/{incident['id']}/evidence")
                assert status == 200 and "findings" in evidence
            snap(page, "06-alerts-incidents")

            print("[QA] 08. Change event becomes incident evidence context")
            page.get_by_role("link", name="Changes", exact=True).click()
            page.get_by_placeholder("Deploy telemetry-api v1.4.2").fill(change_title)
            page.get_by_placeholder("What changed and why?").fill("Real browser QA deployment marker")
            page.get_by_placeholder("Release / ticket / commit reference").fill("qa-" + suffix)
            page.get_by_role("button", name="Record change", exact=True).click()
            expect(page.get_by_text(change_title, exact=True)).to_be_visible(timeout=10_000)
            status, changes = api_json(page, "GET", "/api/changes")
            assert status == 200 and any(c["title"] == change_title for c in changes)
            snap(page, "07-changes")

            print("[QA] 09. SLO CRUD and live status")
            page.get_by_role("link", name="SLOs", exact=True).click()
            expect(page.get_by_role("heading", level=1)).to_contain_text("Service objectives")
            page.get_by_placeholder("99% latency objective").fill(slo_name)
            page.locator("select").nth(0).select_option(host_id if False else (api_json(page, "GET", "/api/hosts")[1][0]["id"]))
            page.get_by_role("button", name="Create SLO", exact=True).click()
            expect(page.get_by_text(slo_name, exact=True)).to_be_visible(timeout=10_000)
            status, slos = api_json(page, "GET", "/api/slos")
            assert status == 200
            slo = next(s for s in slos if s["name"] == slo_name)
            status, slo_status = api_json(page, "GET", f"/api/slos/{slo['id']}/status")
            assert status == 200 and "compliant" in slo_status
            slo_card = action_row(page, slo_name, "Edit")
            slo_card.get_by_role("button", name="Edit", exact=True).click()
            slo_card.get_by_role("button", name="Save changes", exact=True).click()
            status, updated_slos = api_json(page, "GET", "/api/slos")
            assert status == 200 and next(s for s in updated_slos if s["id"] == slo["id"])["name"] == slo_name
            slo_card = action_row(page, slo_name, "Pause")
            slo_card.get_by_role("button", name="Pause", exact=True).click()
            page.once("dialog", lambda dialog: dialog.accept())
            slo_card.get_by_label("Delete " + slo_name, exact=True).click()
            status, updated_slos = api_json(page, "GET", "/api/slos")
            assert status == 200 and all(s["id"] != slo["id"] for s in updated_slos)
            snap(page, "08-slos")

            print("[QA] 10. Webhook notifications: create, test, delivery read-back, update, pause, delete")
            page.get_by_role("link", name="Notifications", exact=True).click()
            expect(page.get_by_role("heading", level=1)).to_contain_text("Notifications")
            page.get_by_placeholder("Production alerts").fill(channel_name)
            page.get_by_placeholder("https://ops.example.com/webhook").fill("http://127.0.0.1:8787/webhook")
            page.get_by_role("button", name="Create channel", exact=True).click()
            expect(page.locator("span").filter(has_text=channel_name).first).to_be_visible(timeout=10_000)
            channel_row = action_row(page, channel_name, "Send test")
            channel_row.get_by_role("button", name="Send test", exact=True).click()
            expect(page.get_by_text("Test delivery queued:", exact=False)).to_be_visible(timeout=10_000)
            for _ in range(20):
                if WebhookCapture.received:
                    break
                page.wait_for_timeout(500)
            assert WebhookCapture.received, "Webhook receiver did not get the real backend delivery"
            received = WebhookCapture.received[-1]
            assert received["headers"].get("X-Telemetry-Signature", "").startswith("sha256=")
            assert received["headers"].get("X-Telemetry-Delivery")
            assert received["headers"].get("X-Telemetry-Event")
            status, deliveries = api_json(page, "GET", "/api/notification-channels/deliveries?limit=50")
            assert status == 200 and any(d["channel_id"] for d in deliveries)
            channel_row = action_row(page, channel_name, "Edit")
            channel_row.get_by_role("button", name="Edit", exact=True).click()
            page.get_by_role("button", name="Save changes", exact=True).click()
            channel_row = action_row(page, channel_name, "Pause")
            channel_row.get_by_role("button", name="Pause", exact=True).click()
            channel_row = action_row(page, channel_name, "Enable")
            channel_row.get_by_role("button", name="Enable", exact=True).click()
            page.once("dialog", lambda dialog: dialog.accept())
            channel_row = action_row(page, channel_name, "Delete")
            channel_row.get_by_role("button", name="Delete", exact=True).click()
            status, channels_after = api_json(page, "GET", "/api/notification-channels")
            assert status == 200 and all(c["name"] != channel_name for c in channels_after)
            snap(page, "09-notifications")

            print("[QA] 11. Synthetic check real HTTP execution and durable run history")
            # Fresh run: backend checkout follows the current synthetic-monitor fix branch.
            page.get_by_role("link", name="Synthetic checks", exact=True).click()
            expect(page.get_by_role("heading", level=1)).to_contain_text("Synthetic checks")
            page.get_by_placeholder("API health").fill(synthetic_name)
            page.get_by_placeholder("https://example.com/health").fill("https://example.com/")
            page.get_by_role("button", name="Create check", exact=True).click()
            expect(page.get_by_role("button", name=re.compile(re.escape(synthetic_name) + r" Enabled")).first).to_be_visible(timeout=10_000)
            check_row = action_row(page, synthetic_name, "Run now")
            check_row.click()
            page.get_by_role("button", name="Run now", exact=True).click()
            expect(page.get_by_text(re.compile(r"Synthetic check (passed|failed)\.")).first).to_be_visible(timeout=20_000)
            status, checks = api_json(page, "GET", "/api/synthetic-checks")
            assert status == 200
            check = next(c for c in checks if c["name"] == synthetic_name)
            status, runs = api_json(page, "GET", f"/api/synthetic-checks/{check['id']}/runs")
            assert status == 200 and len(runs["runs"]) >= 1
            page.get_by_role("button", name="Edit", exact=True).click()
            page.get_by_role("button", name="Save changes", exact=True).click()
            status, checks_after_edit = api_json(page, "GET", "/api/synthetic-checks")
            assert status == 200 and next(c for c in checks_after_edit if c["id"] == check["id"])["name"] == synthetic_name
            page.get_by_role("button", name="Edit", exact=True).click()
            enabled_box = page.get_by_role("checkbox", name="Enabled").first
            if enabled_box.is_checked():
                enabled_box.uncheck()
            page.get_by_role("button", name="Save changes", exact=True).click()
            status, checks_paused = api_json(page, "GET", "/api/synthetic-checks")
            assert status == 200 and next(c for c in checks_paused if c["id"] == check["id"])["enabled"] is False
            page.get_by_role("button", name="Edit", exact=True).click()
            enabled_box = page.get_by_role("checkbox", name="Enabled").first
            if not enabled_box.is_checked():
                enabled_box.check()
            page.get_by_role("button", name="Save changes", exact=True).click()
            status, checks_enabled = api_json(page, "GET", "/api/synthetic-checks")
            assert status == 200 and next(c for c in checks_enabled if c["id"] == check["id"])["enabled"] is True
            status, delete_body = api_json(page, "DELETE", f"/api/synthetic-checks/{check['id']}")
            assert status == 204
            status, checks_after = api_json(page, "GET", "/api/synthetic-checks")
            assert status == 200 and all(c["id"] != check["id"] for c in checks_after)
            snap(page, "10-synthetic-checks")

            print("[QA] 12. Service registry, dependency edge, topology and cleanup")
            page.get_by_role("link", name="Services & topology", exact=True).click()
            expect(page.get_by_role("heading", level=1)).to_contain_text("Services & topology")
            page.get_by_placeholder("Telemetry API").fill(service_a)
            page.get_by_placeholder("Primary API service").fill("QA API service")
            page.get_by_role("button", name="Register service", exact=True).click()
            expect(page.get_by_text(service_a, exact=True)).to_be_visible(timeout=10_000)
            page.get_by_placeholder("Telemetry API").fill(service_b)
            page.get_by_role("button", name="Register service", exact=True).click()
            expect(page.get_by_text(service_b, exact=True)).to_be_visible(timeout=10_000)
            status, services = api_json(page, "GET", "/api/services")
            assert status == 200
            a = next(s for s in services if s["name"] == service_a)
            b = next(s for s in services if s["name"] == service_b)
            page.get_by_text(service_a, exact=True).click()
            page.get_by_text("Add dependency", exact=True).locator("..").get_by_role("button", name="Add dependency", exact=True).click() if False else None
            selects = page.locator("select")
            target_select = selects.filter(has=page.get_by_text(service_b, exact=True)).first
            if target_select.count() == 0:
                target_select = page.locator("select").nth(0)
            target_select.select_option(b["id"])
            page.get_by_role("button", name="Add dependency", exact=True).click()
            expect(page.get_by_text("Dependency added.", exact=True)).to_be_visible(timeout=10_000)
            status, deps = api_json(page, "GET", f"/api/services/{a['id']}/dependencies")
            assert status == 200 and any(d["target_service_id"] == b["id"] for d in deps)
            page.get_by_role("button", name="Dependency topology", exact=True).click()
            expect(page.get_by_role("img", name="Service dependency topology")).to_be_visible(timeout=10_000)
            page.get_by_role("button", name="Service registry", exact=True).click()
            page.get_by_text(service_a, exact=True).click()
            page.get_by_role("button", name=re.compile("Delete")).last.click()
            page.once("dialog", lambda dialog: dialog.accept())
            expect(page.get_by_text(service_a, exact=True)).to_have_count(0)
            page.get_by_text(service_b, exact=True).click()
            page.once("dialog", lambda dialog: dialog.accept())
            page.get_by_role("button", name=re.compile("Delete")).last.click()
            status, services_after = api_json(page, "GET", "/api/services")
            assert status == 200 and all(s["name"] not in {service_a, service_b} for s in services_after)
            snap(page, "11-services-topology")

            print("[QA] 13. Operations runtime + agent access + audit log")
            page.get_by_role("link", name="Operations", exact=True).click()
            expect(page.get_by_text("Pipeline throughput", exact=True)).to_be_visible()
            expect(page.get_by_text("Runtime pressure", exact=True)).to_be_visible()
            status, platform = api_json(page, "GET", "/api/observability/metrics")
            assert status == 200 and "counters" in platform
            page.get_by_role("button", name="Agent access", exact=True).click()
            page.get_by_placeholder("Windows telemetry agent").fill("browser-qa-" + suffix)
            page.get_by_role("button", name="Create key", exact=True).click()
            expect(page.get_by_text("New agent secret", exact=True)).to_be_visible(timeout=10_000)
            secret = page.locator("div.font-mono").filter(has_text="tlm_").last.inner_text()
            assert secret.startswith("tlm_")
            status, keys = api_json(page, "GET", "/api/api-keys")
            assert status == 200 and all("secret" not in k for k in keys)
            key = next(k for k in keys if k["name"] == "browser-qa-" + suffix)
            key_row = action_row(page, key["name"], "Revoke")
            page.once("dialog", lambda dialog: dialog.accept())
            key_row.get_by_role("button", name=re.compile("Revoke")).click()
            status, keys_after = api_json(page, "GET", "/api/api-keys")
            assert status == 200 and next(k for k in keys_after if k["id"] == key["id"])["is_active"] is False
            page.get_by_role("button", name="Audit log", exact=True).click()
            expect(page.get_by_text("Audit", exact=True).first).to_be_visible(timeout=10_000)
            status, audits = api_json(page, "GET", "/api/observability/audit-logs?limit=50")
            assert status == 200 and len(audits) > 0
            snap(page, "12-operations")

            print("[QA] 14. Administration roles, password reset and active-user protection")
            page.get_by_role("link", name="Administration", exact=True).click()
            expect(page.get_by_role("heading", level=1)).to_contain_text("Access management")
            accounts = [
                (viewer_email, "Viewer!12345", "viewer"),
                (operator_email, "Operator!12345", "operator"),
                (second_admin_email, "AdminTwo!12345", "admin"),
            ]
            for email, password, role in accounts:
                page.get_by_placeholder("operator@company.com").fill(email)
                page.get_by_placeholder("Minimum 8 characters").fill(password)
                page.locator("select").first.select_option(role)
                page.get_by_role("button", name="Create", exact=True).click()
                expect(page.get_by_text(email, exact=True)).to_be_visible(timeout=10_000)
            status, users = api_json(page, "GET", "/api/users")
            assert status == 200 and any(u["email"] == viewer_email for u in users)
            viewer_row = action_row(page, viewer_email, "Role")
            viewer_row.get_by_role("button", name="Role", exact=True).click()
            viewer_row.get_by_role("combobox").last.select_option("operator")
            viewer_row.get_by_role("button", name="Save", exact=True).click()
            expect(viewer_row.get_by_text("operator", exact=True)).to_be_visible(timeout=10_000)
            viewer_row.get_by_role("button", name="Role", exact=True).click()
            viewer_row.get_by_role("combobox").last.select_option("viewer")
            viewer_row.get_by_role("button", name="Save", exact=True).click()
            viewer_row.get_by_role("button", name="Reset password", exact=True).click()
            page.get_by_placeholder("New password, minimum 8 characters").fill("ViewerNew!12345")
            viewer_row.get_by_role("button", name="Reset", exact=True).click()
            expect(page.get_by_text("Password reset successfully.", exact=True)).to_be_visible(timeout=10_000)
            current_admin_row = action_row(page, ADMIN_EMAIL, "Deactivate")
            expect(current_admin_row.get_by_role("button", name=re.compile("Deactivate")).first).to_be_disabled()

            print("[QA] 15. Viewer permissions are enforced in UI and API")
            viewer_ctx = browser.new_context(viewport={"width": 1440, "height": 1000})
            viewer = viewer_ctx.new_page()
            login(viewer, viewer_email, "ViewerNew!12345")
            expect(viewer.get_by_role("link", name="Administration", exact=True)).to_have_count(0)
            expect(viewer.get_by_role("button", name="Acknowledge", exact=True)).to_have_count(0)
            status, body = api_json(viewer, "POST", "/api/simulation/pause")
            assert status == 403
            status, body = api_json(viewer, "POST", "/api/hosts", {"name": "should-not-exist", "environment": "qa"})
            assert status == 403
            viewer.close()
            viewer_ctx.close()
            snap(page, "13-rbac-viewer")

            print("[QA] 16. Operator permissions")
            operator_ctx = browser.new_context(viewport={"width": 1440, "height": 1000})
            operator = operator_ctx.new_page()
            login(operator, operator_email, "Operator!12345")
            expect(operator.get_by_text("Telemetry Simulation Engine", exact=True)).to_be_visible()
            expect(operator.get_by_role("link", name="Administration", exact=True)).to_have_count(0)
            expect(operator.get_by_role("button", name="Add host", exact=True)).to_have_count(0)
            status, _ = api_json(operator, "POST", "/api/simulation/pause")
            assert status == 200
            status, _ = api_json(operator, "POST", "/api/simulation/resume")
            assert status == 200
            operator.close()
            operator_ctx.close()

            print("[QA] 17. Cross-session deactivation invalidates an existing JWT")
            admin2_ctx = browser.new_context(viewport={"width": 1440, "height": 1000})
            admin2 = admin2_ctx.new_page()
            login(admin2, second_admin_email, "AdminTwo!12345")
            admin2.get_by_role("link", name="Administration", exact=True).click()
            row = action_row(admin2, ADMIN_EMAIL, "Deactivate")
            row.get_by_role("button", name="Deactivate", exact=True).first.click()
            expect(row.get_by_text("Inactive", exact=True)).to_be_visible(timeout=10_000)
            page.goto(f"{BASE_URL}/app")
            expect(page).to_have_url(f"{BASE_URL}/login", timeout=15_000)
            row.get_by_role("button", name="Activate", exact=True).click()
            login(page, ADMIN_EMAIL, ADMIN_PASSWORD)
            admin2.close()
            admin2_ctx.close()

            print("[QA] 18. Settings password change and re-login")
            page.get_by_role("link", name="Settings", exact=True).click()
            page.get_by_placeholder("Current password").fill(ADMIN_PASSWORD)
            page.get_by_role("textbox", name="New password", exact=True).fill(new_admin_password)
            page.get_by_placeholder("Confirm new password").fill(new_admin_password)
            page.get_by_role("button", name="Update password").click()
            expect(page.get_by_text("Password changed successfully.", exact=True)).to_be_visible(timeout=10_000)
            page.get_by_role("button", name="Sign out").click()
            expect(page).to_have_url(f"{BASE_URL}/")
            login(page, ADMIN_EMAIL, new_admin_password)
            status, _ = api_json(page, "POST", "/api/auth/change-password", {"current_password": new_admin_password, "new_password": ADMIN_PASSWORD})
            assert status == 200

            print("[QA] 19. Mobile navigation and complete page reachability")
            mobile_ctx = browser.new_context(viewport={"width": 390, "height": 844})
            mobile = mobile_ctx.new_page()
            login(mobile, ADMIN_EMAIL, ADMIN_PASSWORD)
            mobile.locator("div.h-16 button").first.click()
            expect(mobile.get_by_role("link", name="Overview", exact=True)).to_be_visible()
            expect(mobile.get_by_role("link", name="Administration", exact=True)).to_be_visible()
            mobile.close()
            mobile_ctx.close()

            print("[QA] 20. Prometheus output and final backend state")
            status, prometheus = api_json(page, "GET", "/api/observability/metrics/prometheus")
            assert status == 200
            assert isinstance(prometheus, str) and "telemetry_" in prometheus
            page.get_by_role("link", name="Dashboard", exact=True).click() if page.get_by_role("link", name="Dashboard", exact=True).count() else page.goto(f"{BASE_URL}/app")
            snap(page, "14-final-dashboard")

            expected_auth_resource_error = "Failed to load resource: the server responded with a status of 401 (Unauthorized)"
            bad = [
                message for message in console_errors
                if "favicon" not in message.lower()
                and "extension" not in message.lower()
                and message != expected_auth_resource_error
            ]
            assert not bad, "Browser console errors: " + repr(bad[:10])

        except Exception:
            try:
                snap(page, "failure-comprehensive")
            finally:
                page.close()
                admin_ctx.close()
                browser.close()
            raise
        else:
            page.close()
            admin_ctx.close()
            browser.close()
        finally:
            receiver.shutdown()
            receiver.server_close()

