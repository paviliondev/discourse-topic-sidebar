import { createWidget } from "discourse/widgets/widget";
import { ajax } from "discourse/lib/ajax";
import { h } from "virtual-dom";
import DiscourseUrl from "discourse/lib/url";
import { emojiUnescape } from "discourse/lib/text";
import { censor } from "pretty-text/censored-words";
import { isRTL } from "discourse/lib/text-direction";
import Site from "discourse/models/site";
import RawHtml from "discourse/widgets/raw-html";

const directlyLinkable = settings.direct_links.split("|");

function listKey(attrs) {
  return `${attrs.topicId}-${attrs.list.name}`;
}

function isDirectlyLinkable(url) {
  if (url) {
    let hostname = new URL(url).hostname;
    if (directlyLinkable.includes(hostname)) {
      return true;
    }
  }

  return false;
}

function getUrl(topic, announcement) {
  let url = topic.url;

  if (announcement) {
    url = topic.ad_url;
  } else if (isDirectlyLinkable(topic.featured_link)) {
    url = topic.featured_link;
  }

  return url;
}

export default createWidget("sidebar-topic-list", {
  tagName: "div.sidebar-topic-list",
  buildKey: (attrs) => `sidebar-topic-list-${listKey(attrs)}`,

  defaultState(attrs) {
    return {
      recorded: null,
      announcement: attrs.list.name === "Announcements",
    };
  },

  html(attrs, state) {
    const { list } = attrs;
    const { announcement } = state;
    const loadingTopics = list.topics === null;
    const hasTopics = !loadingTopics && list.topics.length;

    let result = [];

    if (!announcement) {
      result.push(
        h("h3", h("a", { attributes: { href: `/${list.url}` } }, list.name))
      );
    }

    let topicList;

    if (hasTopics) {
      if (state.recorded !== listKey(attrs)) {
        this.recordAnalytics(
          {
            topic_ids: attrs.list.topics.map((t) => t.id),
          },
          "topics"
        );
        state.recorded = listKey(attrs);
        this.scheduleRerender();
      }

      topicList = this.buildTopicList(list.topics, announcement);
    } else if (loadingTopics) {
      topicList = this.buildPlaceholderList(list.max, announcement);
    } else if (!announcement) {
      topicList = [
        h(`li.no-results`, h("span", I18n.t("choose_topic.none_found"))),
      ];
    }

    result.push(h("ul", topicList));

    return result;
  },

  buildPlaceholderList(count, announcement) {
    return Array.apply(null, Array(parseInt(count)))
      .map(Number.prototype.valueOf, 0)
      .map(() => {
        return h(
          `li.animated-placeholder.placeholder-animation.${
            announcement ? ".announcement" : ""
          }`
        );
      });
  },

  buildTopicList(topics, announcement) {
    return topics.map((t) => {
      return h(
        `li${announcement ? ".announcement" : ""}`,
        this.attach("link", {
          className: `sidebar-topic`,
          action: "clickTopic",
          actionParam: t,
          href: getUrl(t, announcement),
          contents: () => {
            if (announcement && t.show_images && t.image_url) {
              return h("img", {
                attributes: { src: t.image_url, alt: t.fancy_title },
              });
            } else {
              return new RawHtml({ html: this.buildTitleHtml(t) });
            }
          },
        })
      );
    });
  },

  buildTitleHtml(topic) {
    let fancyTitle = censor(
      emojiUnescape(topic.fancy_title),
      Site.currentProp("censored_regexp")
    );

    if (this.siteSettings.support_mixed_text_direction) {
      const titleDir = isRTL(fancyTitle) ? "rtl" : "ltr";
      return `<span dir="${titleDir}">${fancyTitle}</span>`;
    }

    return `<span>${fancyTitle}</span>`;
  },

  clickTopic(topic) {
    this.recordAnalytics({ topic_ids: [topic.id], url: topic.url }, "click");
    const url = getUrl(topic, this.state.announcement);
    DiscourseUrl.routeTo(url);
  },

  recordAnalytics(data, type = null) {
    let base = "/rstudio/analytics";
    let path = `${base}/submit${type === "click" ? "-click" : ""}`;

    ajax({
      url: `${path}.json`,
      type: "POST",
      data,
    }).catch((e) => console.log("sidebar analytics error: ", e));
  },
});
