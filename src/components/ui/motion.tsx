'use client';
// Liikumise abilised (motion.dev). Üks koht vedrude ja korduvate mustrite jaoks, et kogu rakendus liiguks ühtemoodi.
// Kasutaja „vähenda liikumist“ seadet austab MotionProvider (reducedMotion="user").
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import type { ReactNode } from 'react';

/** Rahulik vedru ilma ülelöögita: sisenemised ja tekstivahetused. */
export const soft = { type: 'spring', stiffness: 220, damping: 30, mass: 1 } as const;
/** Kiire vedru kerge ülelöögiga: väikesed elemendid (numbrid, olekud). */
export const snappy = { type: 'spring', stiffness: 520, damping: 30, mass: 0.7 } as const;

const hidden = { opacity: 0, y: 12, filter: 'blur(6px)' };
const shown = { opacity: 1, y: 0, filter: 'blur(0px)' };
const gone = { opacity: 0, y: -8, filter: 'blur(6px)' };

export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={soft}>
      {children}
    </MotionConfig>
  );
}

/**
 * Vahetuv tekst: kui `id` muutub, hajub vana üles ja uus tõuseb alt. Sama `id` korral tekst lihtsalt uueneb
 * (nii ei vilgu lause, mis alles kasvab). Ümbris peab olema `relative`.
 */
export function Swap({ id, className, children }: { id: string | number; className?: string; children: ReactNode }) {
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.p key={id} className={className} initial={hidden} animate={shown} exit={gone}>
        {children}
      </motion.p>
    </AnimatePresence>
  );
}

/** Sisu ilmub, kui see ekraanile keritakse (üks kord). `delay` sekundites järjestikuste ridade jaoks. */
export function Reveal({ delay = 0, className, children }: { delay?: number; className?: string; children: ReactNode }) {
  return (
    <motion.div className={className} initial={hidden} whileInView={shown} viewport={{ once: true, margin: '0px 0px -40px 0px' }} transition={{ ...soft, delay }}>
      {children}
    </motion.div>
  );
}

/** Kaks vaadet samal kohal (nt transkript ja AI aju): vana hajub, uus ilmub. */
export function Switch({ id, className, children }: { id: string; className?: string; children: ReactNode }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={id} className={className} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}>
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/** Rida, mis avaneb kõrguses, kui sisu tekib (nt tsitaat AI aju paneelis). */
export function Expand({ show, className, children }: { show: boolean; className?: string; children: ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {show ? (
        <motion.div className={className} style={{ overflow: 'hidden' }} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
