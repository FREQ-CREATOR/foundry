import { format, parseISO } from "date-fns";
import { allChangelogs } from "contentlayer/generated";
import styles from "../../article.module.scss";

export const generateStaticParams = async () =>
  allChangelogs.map((post) => ({ slug: post.url }));

export const generateMetadata = ({ params }: { params: { slug: string } }) => {
  const post = allChangelogs.find((post) => post.url === params.slug);
  if (!post) throw new Error(`Post not found for slug: ${params.slug}`);
  return { title: post.title };
};

const ChangelogPage = ({ params }: { params: { slug: string } }) => {
  const post = allChangelogs.find((post) => post.url === params.slug);
  if (!post) throw new Error(`Post not found for slug: ${params.slug}`);

  return (
    <article className={styles.article}>
      <div className={styles.header}>
        <time dateTime={post.date} className={styles.date}>
          {format(parseISO(post.date), "LLLL d, yyyy")}
        </time>
        <h1 className={styles.title}>{post.title}</h1>
      </div>
      <div className={styles.body} dangerouslySetInnerHTML={{ __html: post.body.html }} />
    </article>
  );
};

export default ChangelogPage;
