/** Kohustuslik ohutusmärge igal lehel (CLAUDE.md „Ohutus“). Ära eemalda. */
export function SimBanner() {
  return (
    <div role="note" className="w-full border-b border-border bg-surface-2 px-4 py-2 text-center text-sm text-warn">
      Treeningsimulatsioon. Päris hädaolukorras helista 112.
    </div>
  );
}
