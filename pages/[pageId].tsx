import * as React from 'react'

import { useRouter } from "next/router";
import { getPage } from "../lib/notion";
import { BlockMapType } from "notion-client";
import { Page } from "../types";

const PageTemplate = ({ page }: { page: Page }) => {
  const router = useRouter();
  const pageId = router.query.pageId as string;

  if (!page) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>{page.properties.title[0][0]}</h1>
      <BlockMapType blocks={page.properties.blocks} />
    </div>
  );
};

export const getStaticPaths = async () => {
  // ...
};

export const getStaticProps = async ({ params }) => {
  const pageId = params?.pageId as string;
  const page = await getPage(pageId);

  return {
    props: {
      page,
    },
  };
};

export default PageTemplate;
