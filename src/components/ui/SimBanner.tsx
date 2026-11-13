/** Kohustuslik ohutusmärge igal lehel (CLAUDE.md „Ohutus“). Ära eemalda. */
export function SimBanner() {
  return (
    <div role="note" className="flex min-h-9 w-full items-center justify-center bg-warn-soft px-3 py-2 text-center text-xs font-medium leading-4 text-warn">
      Treeningsimulatsioon. Päris hädaolukorras helista 112.
    </div>
  );
}
