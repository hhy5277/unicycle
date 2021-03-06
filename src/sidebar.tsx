import { Menu, Icon, Layout } from 'antd'
import * as React from 'react'
import * as os from 'os'

import { Metadata } from './types'

const { Sider } = Layout

const SubMenu = Menu.SubMenu

interface SidebarProps {
  activeSelection: string | null
  activeComponent: string | null
  metadata: Metadata
  onSelectComponent: (component: string) => void
  onDeleteComponent: (component: string) => void
  onChangeSelection: (selection: string) => void
}

class Sidebar extends React.Component<SidebarProps, any> {
  public render() {
    const key = os.platform() === 'darwin' ? '⌘' : 'Ctrl '

    const { metadata } = this.props
    if (!metadata) return <div />
    const { components } = metadata
    const { activeComponent, activeSelection } = this.props
    return (
      <Sider style={{ height: '100%', overflow: 'auto' }}>
        <Menu
          selectedKeys={
            activeSelection ? (
              [activeSelection === 'component' ? 'c-' + activeComponent : activeSelection]
            ) : (
              []
            )
          }
          defaultOpenKeys={['components']}
          mode="inline"
          theme="dark"
          inlineCollapsed={false}
          onSelect={e => {
            if (e.key.startsWith('c-')) {
              this.props.onSelectComponent(e.key.substring(2))
            } else {
              this.props.onChangeSelection(e.key)
            }
          }}
        >
          <Menu.Item key="style-palette">
            <Icon type="form" />
            <span>Style Palette</span>
          </Menu.Item>
          <Menu.Item key="assets">
            <Icon type="picture" />
            <span>Assets</span>
          </Menu.Item>
          <SubMenu
            key="components"
            title={
              <span>
                <Icon type="global" />
                <span>Web components</span>
              </span>
            }
          >
            {components.map(component => (
              <Menu.Item key={'c-' + component.name}>
                <span
                  draggable
                  onDragStart={e => {
                    console.log('dragstart!')
                    e.dataTransfer.setData('text/plain', component.name)
                    e.dataTransfer.dropEffect = 'copy'
                  }}
                >
                  {component.name}
                </span>
              </Menu.Item>
            ))}
          </SubMenu>
          <Menu.Item key="react-native">
            <Icon type="mobile" />
            <span>React Native</span>
          </Menu.Item>
          <Menu.Item key="email-templates">
            <Icon type="mail" />
            <span>Email templates</span>
          </Menu.Item>
          <Menu.Item key="git-log">
            <Icon type="fork" />
            <span>Git log</span>
          </Menu.Item>
          <Menu.Item key="settings">
            <Icon type="setting" />
            <span>Settings</span>
          </Menu.Item>
        </Menu>
        <p style={{ color: '#777', marginTop: 50, textAlign: 'center' }}>
          <span>Quick Search {key}+T</span>
        </p>
      </Sider>
    )
  }
}

export default Sidebar
