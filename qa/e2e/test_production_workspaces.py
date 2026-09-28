from __future__ import annotations

import os
import time

import pytest
from playwright.sync_api import expect, sync_playwright

BASE_URL = os.environ.get("QA_BASE_URL", "http://127.0.0.1:3000")
ADMIN_EMAIL = os.environ["QA_ADMIN_EMAIL"]
ADMIN_PASSWORD = os.environ["QA_ADMIN_PASSWORD"]


@pytest.mark.e2e
def test_production_workspaces() -> None:
    suffix = str(int(time.time() * 1000))
    service_a = "qa-service-a-" + suffix
    service_b = "qa-service-b-" + suffix
    check_name = "qa-synthetic-" + suffix
    channel_name = "qa-webhook-" + suffix

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 1000})
        try:
            page.goto(f"{BASE_URL}/login")
            page.get_by_label("Email").fill(ADMIN_EMAIL)
            page.get_by_label("Password").fill(ADMIN_PASSWORD)
            page.get_by_role("button", name="Sign in").click()
            expect(page).to_have_url(f"{BASE_URL}/app", timeout=15_000)

            # Service registry + dependency + topology.
            page.get_by_role("link", name="Services", exact=True).click()
            expect(page.get_by_role("heading", level=1)).to_contain_text("Services & dependencies")
            page.get_by_placeholder("Checkout API").fill(service_a)
            page.get_by_placeholder("production").fill("qa")
            page.get_by_role("button", name="Register").click()
            expect(page.get_by_text(service_a, exact=True)).to_be_visible(timeout=10_000)

            page.get_by_placeholder("Checkout API").fill(service_b)
            page.get_by_placeholder("production").fill("qa")
            page.get_by_role("button", name="Register").click()
            expect(page.get_by_text(service_b, exact=True)).to_be_visible(timeout=10_000)

            page.get_by_text(service_a, exact=True).first.click()
            page.get_by_role("combobox").first.select_option(label=service_b)
            page.get_by_role("button", name="Add dependency").click()
            expect(page.get_by_text("1 outbound dependencies", exact=True)).to_be_visible(timeout=10_000)

            page.get_by_role("button", name="Topology graph").click()
            expect(page.get_by_role("img", name="Service dependency topology")).to_be_visible()
            expect(page.locator(`[data-service-name="${service_a}"]`)).to_be_visible()
            expect(page.locator(`[data-service-name="${service_b}"]`)).to_be_visible()

            # Synthetic check CRUD without external network execution.
            page.get_by_role("link", name="Synthetic", exact=True).click()
            expect(page.get_by_role("heading", level=1)).to_contain_text("External checks")
            page.get_by_placeholder("API health check").fill(check_name)
            page.get_by_placeholder("https://example.com/health").fill("https://example.com/health")
            page.get_by_label("Enabled after creation").uncheck()
            page.get_by_role("button", name="Create check").click()
            expect(page.get_by_text(check_name, exact=True)).to_be_visible(timeout=10_000)

            page.get_by_text(check_name, exact=True).click()
            page.get_by_role("button", name="Edit").click()
            expect(page.get_by_text("Edit " + check_name, exact=True)).to_be_visible()
            page.get_by_role("button", name="Save").click()
            page.once("dialog", lambda dialog: dialog.accept())
            page.get_by_text(check_name, exact=True).last.click()
            page.get_by_role("button", name="Delete").click()
            expect(page.get_by_text(check_name, exact=True)).to_have_count(0, timeout=10_000)

            # Notification channel CRUD without sending a webhook.
            page.get_by_role("link", name="Notifications", exact=True).click()
            expect(page.get_by_role("heading", level=1)).to_contain_text("Notification channels")
            page.get_by_role("textbox").nth(0).fill(channel_name)
            page.get_by_role("textbox").nth(1).fill("https://example.com/webhook")
            page.get_by_label("Enabled after creation").uncheck()
            page.get_by_role("button", name="alert.created", exact=True).click()
            page.get_by_role("button", name="incident.created", exact=True).click()
            page.get_by_role("button", name="incident.resolved", exact=True).click()
            page.get_by_role("button", name="Create channel").click()
            expect(page.get_by_text(channel_name, exact=True)).to_be_visible(timeout=10_000)

            row = page.locator("div").filter(has_text=channel_name).first
            row.get_by_role("button", name="Edit").click()
            expect(page.get_by_text("Edit " + channel_name, exact=True)).to_be_visible()
            page.get_by_role("button", name="Save").click()

            page.once("dialog", lambda dialog: dialog.accept())
            row = page.locator("div").filter(has_text=channel_name).first
            row.get_by_role("button", name="Delete").click()
            expect(page.get_by_text(channel_name, exact=True)).to_have_count(0, timeout=10_000)

        finally:
            page.close()
            browser.close()
