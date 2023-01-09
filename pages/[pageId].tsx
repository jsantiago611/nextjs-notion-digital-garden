import * as React from 'react'
import { GetStaticProps } from 'next'

import { NotionPage } from '@/components/NotionPage'
import { domain, isDev } from '@/lib/config'
import { getSiteMap } from '@/lib/get-site-map'
import { resolveNotionPage } from '@/lib/resolve-notion-page'
import { PageProps, Params } from '@/lib/types'

export const getStaticProps: GetStaticProps<PageProps, Params> = async (
  context
) => {
  const rawPageId = context.params.pageId as string

  try {
    const props = await resolveNotionPage(domain, rawPageId)

    return { props, revalidate: 10 }
  } catch (err) {
    console.error('page error', domain, rawPageId, err)

    // we don't want to publish the error version of this page, so
    // let next.js know explicitly that incremental SSG failed
    throw err
  }
}

export async function getStaticPaths() {
  if (isDev) {
    return {
      paths: [],
      fallback: true
    }
  }

  const siteMap = await getSiteMap()

  const staticPaths = {
    paths: Object.keys(siteMap.canonicalPageMap).map((pageId) => ({
      params: {
        pageId
      }
    })),
    // paths: [],
    fallback: true
  }

  console.log(staticPaths.paths)
  return staticPaths
}

export default function NotionDomainDynamicPage(props) {
  return <NotionPage {...props} />
}

//chatgpt starts here


interface MyPageProps {
  page: {
    id: string
    children: {
      title: string
      rich_text: {
        type: string
        text: string
        code: string
      }[]
    }[]
  }
}

const Page: React.FC<MyPageProps> = ({ page }) => {
  return (
    <NotionPage key={page.id}>
      <h1>{page.children[0].title}</h1>
      {page.children[0].rich_text.map((block, i) => {
        if (block.type === 'text') {
          return <p key={i}>{block.text}</p>
        } else if (block.type === 'code') {
          return (
            <pre key={i}>
              <code>{block.code}</code>
            </pre>
                      )
        }
      })}
    </NotionPage>
  )
}

export { Page }
