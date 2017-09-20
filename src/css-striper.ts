import * as crypto from 'crypto'

import {
  CSSChunk,
  CSSMediaQuery,
  PostCSSRoot,
  PostCSSNode,
  PostCSSRule,
  PostCSSAtRule,
  PostCSSPosition,
  SassResult,
  ErrorHandler,
  CSS_PREFIX,
  componentClassName,
  StripedCSS
} from './types'

const postcss = require('postcss')
const parseImport = require('parse-import')
const selectorParser = require('postcss-selector-parser')

interface ParseImportValue {
  condition: string
  path: string
  rule: string
}

export interface PreCSSChunk {
  mediaQueries: string[]
  css: string
  selector?: string
  component: string
}

const addClass = (selector: string, clazz: string) => {
  const transform = (selectors: any) => {
    selectors.each((selector: any) => {
      let node = null
      selector.each((n: any) => {
        if (n.type !== 'pseudo') node = n
      })
      selector.insertAfter(node, selectorParser.className({ value: clazz }))
    })
  }
  return selectorParser(transform).process(selector).result
}

const mediaQueryClassName = (text: string) => {
  return (
    'mq-' +
    crypto
      .createHash('md5')
      .update(text)
      .digest('hex')
      .substr(0, 7)
  )
}

export const stripeCSS = (component: string, ast: PostCSSRoot): StripedCSS => {
  const mediaQueries: {
    [index: string]: CSSMediaQuery
  } = {}
  const chunks: PreCSSChunk[] = []

  const iterateNode = (component: string, node: PostCSSNode, ids: string[]) => {
    if (node.type === 'rule') {
      const rule = node as PostCSSRule
      rule.ids = ids
      chunks.push({
        mediaQueries: ids,
        css: node.nodes!.map(node => node.toString()).join(';\n'),
        selector: rule.selector,
        component
      })
    } else if (node.type === 'atrule') {
      const atrule = node as PostCSSAtRule
      if (atrule.name === 'media') {
        const id = mediaQueryClassName(atrule.toString())
        mediaQueries[id] = atrule.params
        if (node.nodes) {
          const arr = ids.concat(id)
          node.nodes.forEach(node => iterateNode(component, node, arr))
        }
      } else if (atrule.name === 'import') {
        const values = parseImport(
          `@import ${atrule.params};`
        ) as ParseImportValue[]
        if (values.length > 0) {
          const condition = values[0].condition
          // TODO
          // console.log('@import condition', condition)
        }
        chunks.push({
          mediaQueries: ids,
          css: node.toString(),
          component
        })
      } else {
        chunks.push({
          mediaQueries: ids,
          css: node.toString(),
          component
        })
      }
    } else if (node.nodes) {
      node.nodes.forEach(node => iterateNode(component, node, ids))
    }
  }

  iterateNode(component, ast, [])

  const mediaQueriesCount = Object.keys(mediaQueries).length
  chunks.forEach(chunk => {
    if (!chunk.selector) return
    const mq = chunk.mediaQueries
    const classes = chunk.mediaQueries.map(id => `.${id}`).join('')
    const repeat = '.preview-content'.repeat(
      mediaQueriesCount - chunk.mediaQueries.length
    )
    const additionalClass = componentClassName(chunk.component)
    const selector = addClass(chunk.selector, additionalClass)
    chunk.css = `${CSS_PREFIX}${classes}${repeat} ${selector} { ${chunk.css} }`
  })
  return {
    mediaQueries,
    chunks
  }
}
