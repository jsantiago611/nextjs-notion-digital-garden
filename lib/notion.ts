import { ExtendedRecordMap, SearchParams, SearchResults } from 'notion-types'
import { mergeRecordMaps } from 'notion-utils'
import pMap from 'p-map'
import pMemoize from 'p-memoize'

import {
  isPreviewImageSupportEnabled,
  navigationLinks,
  navigationStyle
} from './config'
import { notion } from './notion-api'
import { getPreviewImageMap } from './preview-images'

const getNavigationLinkPages = pMemoize(
  async (): Promise<ExtendedRecordMap[]> => {
    const navigationLinkPageIds = (navigationLinks || [])
      .map((link) => link.pageId)
      .filter(Boolean)

    if (navigationStyle !== 'default' && navigationLinkPageIds.length) {
      return pMap(
        navigationLinkPageIds,
        async (navigationLinkPageId) =>
          notion.getPage(navigationLinkPageId, {
            chunkLimit: 1,
            fetchMissingBlocks: false,
            fetchCollections: false,
            signFileUrls: false
          }),
        {
          concurrency: 4
        }
      )
    }

    return []
  }
)

export async function getPage(pageId: string): Promise<ExtendedRecordMap> {
  let recordMap = await notion.getPage(pageId)

  if (navigationStyle !== 'default') {
    // ensure that any pages linked to in the custom navigation header have
    // their block info fully resolved in the page record map so we know
    // the page title, slug, etc.
    const navigationLinkRecordMaps = await getNavigationLinkPages()

    if (navigationLinkRecordMaps?.length) {
      recordMap = navigationLinkRecordMaps.reduce(
        (map, navigationLinkRecordMap) =>
          mergeRecordMaps(map, navigationLinkRecordMap),
        recordMap
      )
    }
  }

  if (isPreviewImageSupportEnabled) {
    const previewImageMap = await getPreviewImageMap(recordMap)
    ;(recordMap as any).preview_images = previewImageMap
  }

  return recordMap
}

export async function search(params: SearchParams): Promise<SearchResults> {
  return notion.search(params)
}

const extractLinks = (richTextArray) => {
  return flatten(
    richTextArray.map(obj => {
      if (obj.type === 'text') {
        return []
      } else if (obj.type === 'link') {
        return obj.url
      } else if (obj.type === 'embed') {
        return []
      } else {
        return extractLinks(obj.rich_text)
      }
    })
  )
}

const getPageData = async (pageId) => {
  const query = `
    {
      page(id: "${pageId}") {
        id
        parent {
          id
          title
          url
          children {
            title
            url
          }
        }
        children {
          title
          url
          rich_text
        }
      }
    }
  `
  const res = await fetch(
    `https://api.notion.com/v3/query`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_NOTION_TOKEN}`
      },
      body: JSON.stringify({
        query
      })
    }
  )
  const { page } = await res.json()
  return page
}

export async function getServerSideProps({ params }) {
  const pageId = params.id
  const page = await getPageData(pageId)
  const backlinks = uniq(extractLinks(page.children[0].rich_text)).map(link => getPageData(link))
  return {
    props: {
      page: page.children[0],
      backlinks
    }
  }
}
