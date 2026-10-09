import Link from "next/link";

import { marketingBlogPosts } from "@/config/marketing";

export function SiteBlog() {
  return (
    <section className="bg-white py-16 md:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-[var(--brand-sky)]">
            Health & wellness
          </p>
          <h2 className="mt-3 font-heading text-3xl font-extrabold tracking-tight text-[var(--brand-charcoal)] md:text-4xl">
            Dental tips from our team
          </h2>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {marketingBlogPosts.map((post) => (
            <article key={post.title} className="group overflow-hidden rounded-[1.5rem] border border-black/5 bg-white shadow-sm">
              <div className="overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={post.image}
                  alt=""
                  className="aspect-[16/10] w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-5">
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <span className="rounded-full bg-[var(--brand-sky)]/10 px-2.5 py-1 text-[var(--brand-sky)]">
                    {post.category}
                  </span>
                  <span>{post.date}</span>
                </div>
                <h3 className="mt-3 text-lg font-extrabold leading-snug text-[var(--brand-charcoal)]">
                  {post.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{post.excerpt}</p>
                <Link
                  href={post.href}
                  className="mt-4 inline-flex text-sm font-bold text-[var(--brand-teal)] hover:text-[var(--brand-teal-dark)]"
                >
                  Read more
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
