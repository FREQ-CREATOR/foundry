import Link from "next/link";
import { compareDesc, format, parseISO } from "date-fns";
import {
  allPosts,
  Post,
  allChangelogs,
  Changelog,
} from "contentlayer/generated";
import styles from "./blog-section.module.scss";

function PostCard(post: Post) {
  return (
    <div className={styles.card}>
      <h2 className={styles.title}>
        <Link href={`/posts/${post.url}`}>{post.title}</Link>
      </h2>
      <time dateTime={post.date} className={styles.date}>
        {format(parseISO(post.date), "LLLL d, yyyy")}
      </time>
      <div className={styles.body} dangerouslySetInnerHTML={{ __html: post.body.html }} />
    </div>
  );
}

export function BlogSection() {
  const posts = allPosts
    .sort((a, b) => compareDesc(new Date(a.date), new Date(b.date)))
    .slice(0, 3);

  return (
    <div className={styles.section}>
      <h3 className={styles.heading}>Latest Posts</h3>
      {posts.map((post, idx) => (
        <PostCard key={idx} {...post} />
      ))}
    </div>
  );
}

function ChangelogCard(post: Changelog) {
  return (
    <div className={styles.card}>
      <h2 className={styles.title}>
        <Link href={`/changelog/${post.url}`}>{post.title}</Link>
      </h2>
      <time dateTime={post.date} className={styles.date}>
        {format(parseISO(post.date), "LLLL d, yyyy")}
      </time>
      <div className={styles.body} dangerouslySetInnerHTML={{ __html: post.body.html }} />
    </div>
  );
}
export function ChangelogSection() {
  const posts = allChangelogs
    .sort((a, b) => compareDesc(new Date(a.date), new Date(b.date)))
    .slice(0, 3);

  return (
    <div className={styles.section}>
      <h3 className={styles.heading}>Latest Changelog</h3>
      {posts.map((post, idx) => (
        <ChangelogCard key={idx} {...post} />
      ))}
    </div>
  );
}
