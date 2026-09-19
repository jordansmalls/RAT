import test from "node:test";
import assert from "node:assert/strict";
import { performanceWindow, summarizeLinkPerformance } from "../src/utils/link-performance.js";

const now = new Date("2026-09-19T12:00:00Z");
const row = (link, bucket, count) => ({ _id: { link, bucket }, count });

test("rolling windows have 12 equal buckets and reject invalid inputs", () => {
    for (const [window, hours] of [["24h", 24], ["7d", 168], ["30d", 720]]) {
        const period = performanceWindow(window, now);
        assert.equal(period.end - period.start, hours * 3600000);
        assert.equal(period.start - period.previousStart, hours * 3600000);
        assert.equal(period.bucketMs * 12, period.end - period.start);
    }
    for (const value of ["bad", "__proto__", "constructor", [], {}, null]) {
        assert.equal(performanceWindow(value, now), null);
    }
});

test("human click buckets produce counts, change, share, rate and relative velocity", () => {
    const links = [{ _id: "a" }, { _id: "b" }, { _id: "empty" }];
    const result = summarizeLinkPerformance(links, [
        row("a", -12, 6), row("a", -1, 6), row("a", 0, 12), row("a", 11, 12),
        row("b", 5, 12), row("a", 12, 1000), row("a", -13, 1000), row("deleted", 0, 1000),
    ], performanceWindow("24h", now));
    assert.equal(result[0].performance.clicks, 24);
    assert.equal(result[0].performance.previousClicks, 12);
    assert.equal(result[0].performance.changePercent, 100);
    assert.equal(result[0].performance.clicksPerHour, 1);
    assert.equal(result[0].performance.velocityPercent, 100);
    assert.equal(result[1].performance.velocityPercent, 50);
    assert.equal(result[1].performance.changePercent, null);
    assert.ok(Math.abs(result[0].performance.sharePercent - 100 * 2 / 3) < 0.0001);
    assert.deepEqual(result[0].performance.trend, [12, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 12]);
    assert.equal(result[2].performance.clicks, 0);
});

test("empty campaigns and drops to zero never produce NaN or false growth", () => {
    const period = performanceWindow("7d", now);
    assert.deepEqual(summarizeLinkPerformance([], [], period), []);
    const [link] = summarizeLinkPerformance([{ _id: "a" }], [row("a", -1, 3)], period);
    assert.equal(link.performance.changePercent, -100);
    assert.equal(link.performance.velocityPercent, 0);
    assert.equal(link.performance.sharePercent, 0);
    assert.equal(link.performance.clicksPerHour, 0);
});
