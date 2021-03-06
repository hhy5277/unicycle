import { Tabs } from 'antd'

import * as EventEmitter from 'events'
import * as os from 'os'
import * as React from 'react'

import Editor, { Message } from './editors/index'
import JSONEditor from './editors/json'
import MarkupEditor from './editors/markup'
import StyleEditor from './editors/style'

import autocomplete from './autocomplete'
import actions from './editor-actions'
import errorHandler from './error-handler'
import inspector from './inspector'
import workspace from './workspace'
import { inheritedProperties } from './common'

const { TabPane } = Tabs

autocomplete()

const editorIds = ['markup', 'style', 'data']

editorIds.forEach((id, i) => {
  Mousetrap.bind([`command+${i + 1}`, `ctrl+${i + 1}`], (e: any) => {
    Editors.selectEditor(id)
  })
})

class EditorsEventBus extends EventEmitter {}

interface EditorsProps {
  activeComponent: string
}

interface EditorsState {
  selectedTabId: string
}

class Editors extends React.Component<EditorsProps, EditorsState> {
  public static eventBus = new EditorsEventBus()
  public static markupEditor: MarkupEditor | null
  public static styleEditor: StyleEditor | null
  public static dataEditor: JSONEditor | null

  public static selectEditor(selectedTabId: string) {
    Editors.eventBus.emit('selectEditor', selectedTabId)
  }

  public static addState(name: string) {
    if (!this.dataEditor) return
    const lines = this.dataEditor.editor.getModel().getLineCount()
    this.dataEditor.addState(name)
    this.selectEditor('style')
    this.dataEditor.scrollDown()
    this.dataEditor.editor.setPosition({
      lineNumber: lines,
      column: 3
    })
  }

  private static editors: Map<string, Editor> = new Map()

  constructor(props: any) {
    super(props)
    this.state = {
      selectedTabId: 'markup'
    }
    inspector.on('stopInspecting', () => {
      this.stopInspecting()
    })
    inspector.on('inspect', (data: any) => {
      const element = data.target as HTMLElement
      this.inspect(element)
    })

    Editors.eventBus.on('selectEditor', (selectedTabId: string) => {
      this.handleTabChange(selectedTabId)
    })
  }

  public render() {
    const key = os.platform() === 'darwin' ? '⌘' : 'Ctrl '
    return (
      <Tabs
        animated={false}
        activeKey={this.state.selectedTabId}
        onTabClick={(selectedTabId: string) => this.handleTabChange(selectedTabId)}
      >
        <TabPane tab={`Markup ${key}1`} key="markup" forceRender>
          <div
            className="editor"
            onDrop={e => {
              const editor = Editors.markupEditor!.editor
              const component = e.dataTransfer.getData('text/plain')
              if (component) {
                editor.trigger('keyboard', 'type', {
                  text: `\n<include:${component}>$1</include:${component}>`
                })
              } else {
                for (const item of Array.from(e.dataTransfer.items)) {
                  const file = item.getAsFile()
                  if (file) {
                    // TODO
                    editor.trigger('keyboard', 'type', {
                      text: file.path
                    })
                  }
                }
              }
            }}
            onDragEnter={e => e.preventDefault()}
            onDragOver={e => {
              console.log('drag over!!')
              e.preventDefault()
              e.stopPropagation()
              e.dataTransfer.dropEffect = 'copy'

              const editor = Editors.markupEditor!.editor
              editor.focus()
              const position = editor.getTargetAtClientPoint(e.clientX, e.clientY).position
              editor.setPosition(position)
            }}
            ref={element => element && this.initMarkupEditor(element)}
          />
        </TabPane>
        <TabPane tab={`Style ${key}2`} key="style" forceRender>
          <div className="editor" ref={element => element && this.initStyleEditor(element)} />
        </TabPane>
        <TabPane tab={`Tests ${key}3`} key="data" forceRender>
          <div className="editor" ref={element => element && this.initDataEditor(element)} />
        </TabPane>
      </Tabs>
    )
  }

  public componentDidMount() {
    this.updateEditors()
  }

  public componentDidUpdate() {
    this.updateEditors()
  }

  public componentWillUnmount() {
    for (const editor of Editors.editors.values()) {
      editor.editor.dispose()
    }
    Editors.editors.clear()
    Editors.markupEditor = null
    Editors.styleEditor = null
    Editors.dataEditor = null
  }

  private updateEditors() {
    Editors.editors.forEach(editor => {
      editor.setComponent(this.props.activeComponent)
    })
  }

  private inspect(element: HTMLElement) {
    const location = element.getAttribute('data-location')
    if (!location) {
      Editors.styleEditor!.setMessages('inspector', [])
      return
    }
    const locationData = JSON.parse(location)
    const lineNumber = locationData.ln as number
    const column = locationData.c as number
    const endLineNumber = locationData.eln as number
    const endColumn = locationData.ec as number
    Editors.markupEditor!.editor.revealLinesInCenterIfOutsideViewport(lineNumber, endLineNumber)
    Editors.markupEditor!.editor.setPosition({
      lineNumber,
      column
    })
    if (endLineNumber !== undefined && endColumn !== undefined) {
      Editors.markupEditor!.editor.setSelection({
        startLineNumber: lineNumber,
        startColumn: column,
        endLineNumber,
        endColumn
      })
    }
    this.focusVisibleEditor()

    const matches = (elem: HTMLElement, selector: string): HTMLElement | null => {
      if (elem.matches('.preview-content')) return null
      if (elem.matches(selector)) return elem
      if (elem.parentElement) return matches(elem.parentElement, selector)
      return null
    }

    const { activeComponent } = this.props
    const component = workspace.getComponent(activeComponent)
    const messages: Message[] = []
    component.style.iterateSelectors(info => {
      const match = matches(element, info.selector)
      if (match) {
        const type = match === element ? 'success' : 'info'
        const text = match === element ? 'Matching selector' : 'Parent matching selector'
        info.children.forEach(mapping => {
          const affects =
            match === element || inheritedProperties.includes(mapping.declaration.prop)
          if (affects) {
            messages.push({
              position: new monaco.Position(mapping.line, mapping.column),
              text,
              type
            })
          }
        })
        messages.push({
          position: new monaco.Position(info.mapping.line, info.mapping.column),
          text,
          type
        })
      }
    })
    Editors.styleEditor!.setMessages('inspector', messages)
  }

  private focusVisibleEditor() {
    const editor = Editors.editors.get(this.state.selectedTabId)
    if (editor) {
      editor.editor.focus()
    }
  }

  private stopInspecting() {
    Editors.styleEditor!.cleanUpMessages('inspector')
  }

  private handleTabChange(selectedTabId: string) {
    this.setState({ selectedTabId })
    const editor = Editors.editors.get(selectedTabId)
    if (editor) {
      editor.setDirty()
    }
  }

  private initMarkupEditor(element: HTMLDivElement) {
    if (Editors.markupEditor) return
    const editor = new MarkupEditor(element, errorHandler)
    Editors.markupEditor = editor
    Editors.editors.set('markup', editor)
    actions.forEach(action => editor.editor.addAction(action))

    // Hack to get the first previews.render() with the editor loaded and ready
    let first = true
    editor.editor.onDidChangeModelContent(() => {
      if (first) {
        workspace.emit('componentUpdated')
        first = false
      }
    })
  }

  private initStyleEditor(element: HTMLDivElement) {
    if (Editors.styleEditor) return
    const editor = new StyleEditor(element, errorHandler)
    Editors.styleEditor = editor
    Editors.editors.set('style', editor)
    actions.forEach(action => editor.editor.addAction(action))
  }

  private initDataEditor(element: HTMLDivElement) {
    if (Editors.dataEditor) return
    const editor = new JSONEditor(element, errorHandler)
    Editors.dataEditor = editor
    Editors.editors.set('data', editor)
    actions.forEach(action => editor.editor.addAction(action))
  }
}

export default Editors
