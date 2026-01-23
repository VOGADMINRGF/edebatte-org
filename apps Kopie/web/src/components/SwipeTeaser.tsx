"use client";

import Link from "next/link";
import { FiThumbsUp, FiMinus, FiThumbsDown } from "react-icons/fi";
import Button from "@ui/design/Button";

type Teaser = {
  title: string;
  k1: string;
  k2: string;
  k3: string;
  href: string;
};

export default function SwipeTeaser() {
  return (
    <section className="px-6 py-10 md:py-14">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
            Schnell reinswipen & Position finden
          </h2>
          <Link href="/swipes">
            <Button variant="secondary">Jetzt swipen</Button>
          </Link>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {TEASERS.map((t) => (
            <article
              key={t.title}
              className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm hover:shadow-md transition"
            >
              <h3 className="text-lg font-semibold text-gray-900">{t.title}</h3>
              <ul className="mt-3 space-y-2 text-sm text-gray-700">
                <li className="flex items-center gap-2">
                  <FiThumbsUp className="text-emerald-600" />
                  <span>{t.k1}</span>
                </li>
                <li className="flex items-center gap-2">
                  <FiMinus className="text-amber-600" />
                  <span>{t.k2}</span>
                </li>
                <li className="flex items-center gap-2">
                  <FiThumbsDown className="text-rose-600" />
                  <span>{t.k3}</span>
                </li>
              </ul>
              <div className="mt-5">
                <Link href={t.href}>
                  <Button variant="ghost">Zum Swipe-Modus</Button>
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
