import { Helmet } from "react-helmet-async";

type SeoProps = {
  title: string;
  description?: string;
  image?: string;
  type?: "website" | "article" | "product";
  path?: string; // canonical path, relative
  jsonLd?: Record<string, any> | Record<string, any>[];
};

const SITE_NAME = "Shakkel";

export const Seo = ({ title, description, image, type = "website", path, jsonLd }: SeoProps) => {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const url = origin + (path ?? (typeof window !== "undefined" ? window.location.pathname : ""));
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
  const desc = (description || "").slice(0, 160);
  return (
    <Helmet>
      <title>{fullTitle}</title>
      {desc && <meta name="description" content={desc} />}
      <link rel="canonical" href={url} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      {desc && <meta property="og:description" content={desc} />}
      <meta property="og:url" content={url} />
      {image && <meta property="og:image" content={image} />}
      <meta name="twitter:card" content={image ? "summary_large_image" : "summary"} />
      <meta name="twitter:title" content={fullTitle} />
      {desc && <meta name="twitter:description" content={desc} />}
      {image && <meta name="twitter:image" content={image} />}
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
    </Helmet>
  );
};
