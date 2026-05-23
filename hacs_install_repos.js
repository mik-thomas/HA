// Run in HACS iframe via CDP (contextId for hacs frame)
async function installRepo(search, nameMatch) {
  function all(root, acc = []) {
    root.querySelectorAll?.("*").forEach((el) => {
      acc.push(el);
      if (el.shadowRoot) all(el.shadowRoot, acc);
    });
    return acc;
  }
  const els = all(document);
  const input = els.find((e) => e.tagName === "INPUT");
  if (input) {
    input.value = search;
    input.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true }));
  }
  await new Promise((r) => setTimeout(r, 1500));
  const row = all(document).find((e) => {
    const t = e.textContent || "";
    return nameMatch(t) && t.length < 400;
  });
  if (!row) return { search, status: "not_found" };
  row.click();
  await new Promise((r) => setTimeout(r, 1500));
  const dl = all(document).find((e) => (e.textContent || "").trim() === "Download");
  if (!dl) return { search, status: "no_download_btn" };
  dl.click();
  await new Promise((r) => setTimeout(r, 500));
  const dlg = all(document).find((e) => e.tagName === "HA-DIALOG");
  if (dlg) {
    const confirm = all(dlg).find(
      (e) => e.tagName === "MWC-BUTTON" && /^Download$/i.test((e.textContent || "").trim())
    );
    if (confirm) {
      confirm.click();
      await new Promise((r) => setTimeout(r, 12000));
    }
  } else {
    await new Promise((r) => setTimeout(r, 2500));
  }
  const back = all(document).find(
    (e) => (e.textContent || "").trim() === "Back" || e.getAttribute?.("aria-label") === "Back"
  );
  if (back) back.click();
  await new Promise((r) => setTimeout(r, 1000));
  return { search, status: "downloaded" };
}

const repos = [
  ["Mushroom", (t) => /Mushroom Cards|lovelace-mushroom/i.test(t) && !/theme/i.test(t)],
  ["button-card", (t) => /custom:button-card|button-card/i.test(t) && !/slider|builder|check/i.test(t)],
  ["card-mod", (t) => /card-mod/i.test(t)],
  ["layout-card", (t) => /layout-card/i.test(t)],
  ["auto-entities", (t) => /auto-entities/i.test(t)],
  ["decluttering-card", (t) => /decluttering/i.test(t)],
  ["mini-graph-card", (t) => /mini-graph-card/i.test(t)],
  ["ha-floorplan", (t) => /ha-floorplan|floorplan card/i.test(t) && !/padspan/i.test(t)],
];

(async () => {
  const results = [];
  for (const [search, match] of repos) {
    results.push(await installRepo(search, match));
  }
  return results;
})();
