"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";

function getDeviceType(ua: string): "mobile" | "tablet" | "desktop" {
  if (/tablet|ipad|playbook|silk/i.test(ua)) return "tablet";
  if (/mobile|android|iphone|ipod|blackberry|opera mini|iemobile/i.test(ua)) return "mobile";
  return "desktop";
}

function getOrCreateSession(): string {
  const key = "agm_sid";
  const ttlKey = "agm_sid_ts";
  const now = Date.now();
  const ttl = 30 * 60 * 1000; // 30 min

  const stored = localStorage.getItem(key);
  const ts = parseInt(localStorage.getItem(ttlKey) ?? "0", 10);

  if (stored && now - ts < ttl) {
    localStorage.setItem(ttlKey, String(now));
    return stored;
  }

  const newId = crypto.randomUUID();
  localStorage.setItem(key, newId);
  localStorage.setItem(ttlKey, String(now));
  return newId;
}

function AnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const sessionId = getOrCreateSession();
    const ua = navigator.userAgent;

    const payload = {
      sessionId,
      pathname,
      referrer: document.referrer || null,
      utmSource:   searchParams.get("utm_source"),
      utmMedium:   searchParams.get("utm_medium"),
      utmCampaign: searchParams.get("utm_campaign"),
      deviceType:  getDeviceType(ua),
      userAgent:   ua,
    };

    fetch("/api/analytics/pageview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  }, [pathname, searchParams]);

  return null;
}

export default function AnalyticsProvider() {
  return (
    <Suspense fallback={null}>
      <AnalyticsTracker />
    </Suspense>
  );
}

// Función utilitaria para trackear eventos desde cualquier componente client
export function trackEvent(name: string, properties?: Record<string, unknown>) {
  const key = "agm_sid";
  const sessionId = localStorage.getItem(key) ?? "unknown";
  const pathname = window.location.pathname;

  fetch("/api/analytics/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, eventName: name, properties, pathname }),
    keepalive: true,
  }).catch(() => {});
}
