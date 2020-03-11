import { withPluginApi } from 'discourse/lib/plugin-api';

export default {
  name: 'topic-sidebar-initializer',
  initialize(container) {    
    withPluginApi('0.8.37', api => {
      if (settings.topic_lists_enabled) {
        api.reopenWidget('topic-timeline-container', {
          buildKey: (attrs) => `topic-timeline-container-${attrs.topic_id}`,
          
          defaultState() {
            return {
              sidebar: true
            }
          },
          
          html(attrs, state) {
            let result = [];
            
            result.push(this.attach('link', {
              icon: state.sidebar ? 'undo' : 'redo',
              action: 'toggleSidebar',
              className: 'toggle-sidebar'
            }));
            
            let tagName = 'div.timeline-container';
            if (state.sidebar) tagName += '.topic-sidebar-container';
            this.__proto__.__proto__.tagName = tagName;
                        
            const widget = state.sidebar ? 'topic-sidebar' : 'topic-timeline';
            result.push(this.attach(widget, attrs));
            
            return result;
          },
          
          toggleSidebar() {
            this.state.sidebar = !this.state.sidebar;
            this.scheduleRerender();
          }
        })
      }
    });
  }
}