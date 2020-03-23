import { createWidget } from "discourse/widgets/widget";
import { h } from "virtual-dom";

const topicLists = settings.topic_lists.split('|').map(l => {
  let parts = l.split(',');
  return {
    name: parts[0],
    url: parts[1],
    topics: null,
    max: parts[2] || 5
  }
});

export default createWidget("topic-sidebar", {
  tagName: "div.topic-sidebar",
  buildKey: (attrs) => `topic-sidebar-${attrs.topic.id}`,

  defaultState(attrs) {
    let lists = {};
    
    topicLists.forEach(list => {
      lists[list.name] = list;
    });
    
    return {
      loading: null,
      lists
    };
  },
  
  loadTopics(state) {
    state.loading = true;
    
    Promise.all(
      topicLists.map((l) => this.fetchTopicList(l, state))
    ).finally(() => {
      state.loading = false;
      this.scheduleRerender();
    });
    
    this.scheduleRerender();
  },

  html(attrs, state) {    
    
    if (state.loading == null) {
      this.loadTopics(state);
    }
    
    let result = [];
    
    Object.keys(state.lists).forEach(name => {
      let list = state.lists[name];
      if (list.topicId !== attrs.topic.id) list.topics = null;
      result.push(this.attach('sidebar-topic-list', {
        list,
        topicId: attrs.topic.id 
      }));
    });

    return result;
  },

  fetchTopicList(list, state) {   
    return this.store.findFiltered("topicList", {
      filter: list.url,
      params: {
        status: 'open',
        per_page: list.max,
        no_definitions: true,
        random: true,
        visible: true,
        announcement: list.name === 'Announcements'
      }
    }).then(result => {
      if (result.topics) {
        state.lists[list.name].topicId = this.attrs.topic.id;
        state.lists[list.name].topics = result.topics.slice(0, list.max); // ensure max (per page is normally private)
      }
    }).catch((e) => {
      console.log(e);
    });
  }
});