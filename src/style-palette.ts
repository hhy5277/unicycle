import * as sass from 'node-sass'

import {
  PostCSSAtRule,
  PostCSSComment,
  PostCSSDeclaration,
  PostCSSNode,
  PostCSSRoot
} from './types'
import workspace from './workspace'
import { CSS_URL_REGEXP } from './utils'

const postcss = require('postcss')

export interface StylePaletteEntity {
  name: string
  value: string
  hover?: string
}

class StylePalette {
  public readonly fonts: StylePaletteEntity[] = []
  public readonly colors: StylePaletteEntity[] = []
  public readonly shadows: StylePaletteEntity[] = []
  public readonly animations: StylePaletteEntity[] = []
  public readonly fontFaces: StylePaletteEntity[] = []
  public allFontFaces: string = ''
  public readonly attributes = new Map<string, string>()
  public source: string = ''
  public result: string = ''

  public setSource(source: string) {
    source = source || '/**/' // node-sass fails if the input is empty
    this.source = source

    const result = sass.renderSync({
      data: source,
      sourceMap: false
    })
    this.result = result.css.toString()
    const ast = postcss.parse(this.result) as PostCSSRoot

    this.fonts.splice(0)
    this.colors.splice(0)
    this.shadows.splice(0)
    this.animations.splice(0)
    this.attributes.clear()

    const prefixes = {
      '--font-': this.fonts,
      '--color-': this.colors,
      '--shadow-': this.shadows
    }

    const iterateNode = (node: PostCSSNode, ids: string[]) => {
      if (node.type === 'comment') {
        const comment = node as PostCSSComment
        const { text } = comment
        const match = comment.text.match(/^\/\s*@/)
        if (match) {
          const rule = text.substr(match[0].length)
          const index = rule.indexOf(':')
          if (index >= 0) {
            const key = rule.substring(0, index).trim()
            const value = rule.substring(index + 1).trim()
            if (key && value) {
              this.attributes.set(key, value)
            }
          }
        }
        // console.log('comment', comment.text)
      } else if (node.type === 'decl') {
        const decl = node as PostCSSDeclaration
        const { prop } = decl
        // Replace relative URLs to absolute URLs
        decl.value = decl.value.replace(
          CSS_URL_REGEXP,
          (match, p1, p2) => `url('${workspace.dir + '/assets/' + p2}')`
        )
        for (const [prefix, collection] of Object.entries(prefixes)) {
          if (prop.startsWith(prefix)) {
            const name = prop.substr(prefix.length)
            collection.push({
              name,
              value: decl.value
            })
          }
        }
      } else if (node.type === 'atrule') {
        const rule = node as PostCSSAtRule
        if (rule.name === 'keyframes') {
          this.animations.push({
            name: rule.params,
            value: rule.toString()
          })
        } else if (rule.name === 'font-face') {
          if (node.nodes) {
            node.nodes.forEach(childNode => iterateNode(childNode, ids))
          }
          this.fontFaces.push({
            name: '',
            value: rule.toString()
          })
        }
      } else if (node.nodes) {
        node.nodes.forEach(childNode => iterateNode(childNode, ids))
      }
      this.allFontFaces = this.fontFaces.map(fontFace => fontFace.value).join('\n')
    }

    iterateNode(ast, [])

    // TODO: parse
  }
}

export default StylePalette
