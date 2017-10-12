import errorHandler from './error-handler'
import workspace from './workspace'

import { Tab2, Tabs2 } from '@blueprintjs/core'
import * as React from 'react'

class StylePaletteView extends React.Component<any, any> {
  private editor: monaco.editor.IStandaloneCodeEditor

  public componentWillUnmount() {
    this.editor.dispose()
  }

  public render() {
    const palette = workspace.palette
    const previewText =
      palette.attributes.get('font-preview-text') || 'Hello world'
    return (
      <div style={{ display: 'flex' }}>
        <style>
          {`.style-palette-name {
            opacity: 0.7;
          }

          .style-palette-value {
            opacity: 0.7;
          }`}
          {palette.shadows
            .map(
              shadow => `
              .style-palette-shadow-${shadow.name} {
                box-shadow: ${shadow.value};
                width: 130px;
                height: 66px;
                transition: all 0.1s;
              }
              .style-palette-shadow-${shadow.name}:hover {
                box-shadow: ${shadow.hover};
              }
          `
            )
            .join('\n')}
          {palette.animations.map(animation => animation.value).join('\n')}
        </style>
        <div
          className="editor"
          ref={element => {
            if (!element) return
            this.initEditor(element)
          }}
          style={{
            height: 'calc(100vh - 60px)',
            width: 700,
            marginRight: 20
          }}
        />
        <Tabs2
          id="StylePaletteTabs"
          onChange={(selectedTabId: string) => console.log(selectedTabId)}
        >
          <Tab2
            id="fonts"
            title="Fonts"
            panel={
              <div>
                {palette.fonts.map((font, i) => (
                  <div key={i} style={{ marginBottom: 20 }}>
                    <div className="style-palette-name">{font.name}</div>
                    <div style={{ font: font.value }}>{previewText}</div>
                  </div>
                ))}
              </div>
            }
          />
          <Tab2
            id="colors"
            title="Colors"
            panel={
              <div>
                {palette.colors.map((color, i) => (
                  <div key={i} style={{ marginBottom: 20 }}>
                    <div className="style-palette-name">{color.name}</div>
                    <div
                      style={{
                        backgroundColor: color.value,
                        width: 130,
                        height: 66
                      }}
                    />
                    <p className="style-palette-value">{color.value}</p>
                  </div>
                ))}
              </div>
            }
          />
          <Tab2
            id="shadows"
            title="Shadows"
            panel={
              <div>
                {palette.shadows.map((shadow, i) => (
                  <div key={i} style={{ marginBottom: 20 }}>
                    <div className="style-palette-name">{shadow.name}</div>
                    <div
                      className={`style-palette-shadow-${shadow.name}`}
                      style={{
                        width: 130,
                        height: 66
                      }}
                    />
                  </div>
                ))}
              </div>
            }
          />
          <Tab2
            id="animations"
            title="Animations"
            panel={
              <div>
                {palette.animations.map(animation => (
                  <div key={animation.name} style={{ marginBottom: 20 }}>
                    <div className="style-palette-name">{animation.name}</div>
                    <div
                      style={{
                        animation: `${animation.name} 1s infinite`,
                        width: 130,
                        height: 66,
                        backgroundColor: '#50C56A'
                      }}
                    />
                  </div>
                ))}
              </div>
            }
          />
        </Tabs2>
      </div>
    )
  }

  private initEditor(element: HTMLElement): any {
    if (this.editor) return
    const palette = workspace.palette
    this.editor = monaco.editor.create(element, {
      language: 'scss',
      value: palette.source,
      lineNumbers: 'on',
      scrollBeyondLastLine: false,
      minimap: { enabled: false },
      autoIndent: true,
      theme: 'vs',
      automaticLayout: true
    })
    this.editor.onDidChangeModelContent(e => {
      const str = this.editor.getValue()

      workspace
        .writeStylePalette(str)
        .then(() => {
          this.forceUpdate()
        })
        .catch(errorHandler)
    })
  }
}

export default StylePaletteView
