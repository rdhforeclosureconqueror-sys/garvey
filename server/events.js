"use strict";

const EVENT_NAMES = Object.freeze({
  PRODUCT_CREATED: "product_created",
  PRODUCT_UPDATED: "product_updated",
  PRODUCT_DELETED: "product_deleted",
  REVIEW_PRODUCT_LINKED: "review_product_linked",
  PRODUCT_SHOWCASE_ACTIVITY: "product_showcase_activity",
  SHOWCASE_IMPRESSION: "showcase_impression",
  SHOWCASE_VIEW_PRODUCT_CLICK: "showcase_view_product_click",
  SHOWCASE_WISHLIST_SAVE: "showcase_wishlist_save",
  SPOTLIGHT_ACTIVITY: "spotlight_activity",
  CONTRIBUTION_ACTIVITY: "contribution_activity",
});

module.exports = {
  EVENT_NAMES,
};
