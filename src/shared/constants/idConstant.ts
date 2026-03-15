/**
 * A centralized collection of all custom IDs used for Discord interaction components.
 * Includes IDs for buttons, modals, select menus, and input fields across various features
 * like Settings, Confessions, Donations, Tickets, and Word Chains.
 */
export const CUSTOM_ID = {
  // Navigation
  BTN_SETTING_NAV_GENERAL: 'btn-setting-nav-general',
  BTN_SETTING_NAV_TICKET: 'btn-setting-nav-ticket',
  BTN_SETTING_NAV_DONATION: 'btn-setting-nav-donation',
  BTN_SETTING_NAV_CONFESSION: 'btn-setting-nav-confession',
  BTN_SETTING_NAV_BACK: 'btn-setting-nav-back',

  // Confession Buttons
  BTN_CONFESSION_SEND_ANONYMOUS: 'btn-confession-send-anonymous',
  BTN_CONFESSION_SEND_PUBLIC: 'btn-confession-send-public',
  BTN_CONFESSION_CHECK_DM: 'btn-confession-check-dm',
  BTN_CONFESSION_GENERAL_SETTING: 'btn-confession-general-setting',
  BTN_CONFESSION_SEND: 'btn-confession-send',
  BTN_CONFESSION_CREATE_NOTIFICATION_THREAD:
    'btn-confession-create-notification-thread',

  // Confession Dynamic Prefixes
  CONFESSION_LIST_PREFIX: 'confession-list:',
  BTN_CONFESSION_APPROVE_PREFIX: 'btn-confession-approve:',
  BTN_CONFESSION_REJECT_PREFIX: 'btn-confession-reject:',
  BTN_CONFESSION_VIEW_PREFIX: 'btn-confession-view:',

  // Confession Modals
  MODAL_CONFESSION_ANONYMOUS: 'modal-confession-anonymous',
  MODAL_CONFESSION_NAMED: 'modal-confession-named',
  MODAL_CONFESSION_GENERAL_SETTING: 'modal-confession-general-setting',
  MODAL_CONFESSION_REJECT_PREFIX: 'modal-confession-reject:',

  // Input Fields
  INPUT_CONTENT: 'content',
  INPUT_TAG: 'tag',
  INPUT_DONATION_AMOUNT: 'input-donation-amount',
  INPUT_DONATION_MESSAGE: 'input-donation-message',
  INPUT_AMOUNT: 'amount',
  INPUT_DESCRIPTION: 'description',
  INPUT_REASON: 'reason',

  // Donation Buttons
  BTN_DONATION_CREATE: 'btn-donation-create',
  BTN_DONATION_STATS: 'btn-donation-stats',
  BTN_DONATION_SEND: 'btn-donation-send',
  BTN_DONATION_CREATE_NOTIFICATION_THREAD:
    'btn-donation-create-notification-thread',
  BTN_DISBURSEMENT_LOG_SETTING: 'btn-disbursement-log-setting',
  SELECT_DISBURSEMENT_LOG_CHANNEL: 'select-disbursement-log-channel',

  // Donation Dynamic Prefixes
  DONATION_LIST_PREFIX: 'donation-list:',
  BTN_DONATION_DONOR_CONFIRMED_PREFIX: 'btn-donation-donor-confirmed:',
  BTN_DONATION_DONOR_CANCELED_PREFIX: 'btn-donation-donor-canceled:',
  BTN_DONATION_CHANGE_STATUS_PREFIX: 'btn-donation-change-status:',

  // Donation Modals
  MODAL_DONATION_CREATE: 'modal-donation-create',

  // General Settings
  BTN_CHANNEL_SETTING: 'btn-channel-setting',
  BTN_GENERAL_CREATE_ERROR_NOTIFICATION_THREAD:
    'btn-general-create-error-notification-thread',
  MODAL_CHANNEL_SETTING: 'modal-channel-setting',

  // Ticket Buttons
  BTN_TICKET_BUG: 'btn-ticket-bug',

  // Setting
  SELECT_SETTING_NAV: 'select-setting-nav',
  BTN_SETTING_CHANNEL_CONFIG: 'btn-setting-channel-config',
  BTN_SETTING_SYNC_GUIDES: 'btn-setting-sync-guides',
  BTN_SETTING_SYNC_NOTIFICATIONS: 'btn-setting-sync-notifications',
  BTN_SETTING_TEMPVOICE_CHANNEL: 'btn-setting-tempvoice-channel',
  MODAL_SETTING_CHANNEL_CONFIG: 'modal-setting-channel-config',
  SELECT_SETTING_SERVICE_FORUM: 'select-setting-service-forum',
  SELECT_SETTING_NOTIFICATION_FORUM: 'select-setting-notification-forum',
  SELECT_SETTING_CONFESSION_FORUM: 'select-setting-confession-forum',
  SELECT_SETTING_DISBURSEMENT_LOG: 'select-setting-disbursement-log',
  SELECT_SETTING_TICKET_CATEGORY: 'select-setting-ticket-category',
  MODAL_SETTING_TEMPVOICE_CHANNEL: 'modal-setting-tempvoice-channel',
  SELECT_SETTING_TEMPVOICE_CREATE_CHANNEL:
    'select-setting-tempvoice-create-channel',
  SELECT_SETTING_TEMPVOICE_CATEGORY: 'select-setting-tempvoice-category',

  // Setting -> General
  BTN_TICKET_FEEDBACK: 'btn-ticket-feedback',
  BTN_TICKET_REPORT: 'btn-ticket-report',
  BTN_TICKET_GENERAL_SETTING: 'btn-ticket-general-setting',
  BTN_TICKET_SEND: 'btn-ticket-send',
  BTN_TICKET_CREATE_NOTIFICATION_THREAD:
    'btn-ticket-create-notification-thread',

  // Ticket Modals / Dynamic
  MODAL_TICKET_GENERAL_SETTING: 'modal-ticket-general-setting',
  TICKET_LIST_PREFIX: 'ticket-list:',
  BTN_TICKET_DELETE_PREFIX: 'btn-ticket-delete:',

  // Disbursement
  MODAL_DISBURSEMENT_CREATE: 'modal-disbursement-create',
  MODAL_DISBURSEMENT_LOG_SETTING: 'modal-disbursement-log-setting',
  BTN_DISBURSEMENT_LIST: 'btn-disbursement-list',
  DISBURSEMENT_LIST_PREFIX: 'disbursement-list:',
  INPUT_DISBURSEMENT_AMOUNT: 'input-disbursement-amount',
  INPUT_DISBURSEMENT_DESCRIPTION: 'input-disbursement-description',
  UPLOAD_DISBURSEMENT_IMAGES: 'upload-disbursement-images',
  BTN_DISBURSEMENT_DELETE_PREFIX: 'btn-disbursement-delete:',

  // Word Chain Setting
  BTN_SETTING_WORDCHAIN_CHANNEL: 'btn-setting-wordchain-channel',
  MODAL_SETTING_WORDCHAIN_CHANNEL: 'modal-setting-wordchain-channel',
  SELECT_SETTING_VIETNAMESE_WORDCHAIN_CHANNEL:
    'select-setting-vietnamese-wordchain-channel',
  SELECT_SETTING_ENGLISH_WORDCHAIN_CHANNEL:
    'select-setting-english-wordchain-channel',

  // iChart Setting
  BTN_SETTING_ICHART_CONFIG: 'btn-setting-ichart-config',
  MODAL_SETTING_ICHART_CONFIG: 'modal-setting-ichart-config',
  INPUT_ICHART_SONG_ID: 'input-ichart-song-id',
  INPUT_ICHART_SONG_NAME: 'input-ichart-song-name',

  // Word Chain Modals
  MODAL_WORDCHAIN_ADD_VI: 'modal-wordchain-add-vi',
  MODAL_WORDCHAIN_ADD_EN: 'modal-wordchain-add-en',
  INPUT_WORDCHAIN_PHRASES: 'input-wordchain-phrases',

  // Utility
  MODAL_COMMENT_PREFIX: 'modal-comment:',

  // Voice
  MODAL_VOICE_TRUST_USER: 'modal-voice-trust-user',
  SELECT_VOICE_TRUST_USER: 'select-voice-trust-user',
  MODAL_VOICE_TRUST_ROLE: 'modal-voice-trust-role',
  SELECT_VOICE_TRUST_ROLE: 'select-voice-trust-role',
  SELECT_VOICE_KICK: 'select-voice-kick',
  SELECT_VOICE_INVITE: 'select-voice-invite',

  // VIP
  BTN_VIP_EDIT_NAME: 'btn-vip-edit-name',
  BTN_VIP_EDIT_COLOR: 'btn-vip-edit-color',
  BTN_VIP_EDIT_ICON: 'btn-vip-edit-icon',
  MODAL_VIP_ADD: 'modal-vip-add',
  MODAL_VIP_EDIT_NAME: 'modal-vip-edit-name',
  MODAL_VIP_EDIT_COLOR: 'modal-vip-edit-color',
  MODAL_VIP_EDIT_ICON: 'modal-vip-edit-icon',
  SELECT_VIP_ADD_USER: 'select-vip-add-user',
  SELECT_VIP_ADD_ROLE: 'select-vip-add-role',
  SELECT_VIP_ADD_TYPE: 'select-vip-add-type',
  SELECT_VIP_ADD_DURATION: 'select-vip-add-duration',
  BTN_SETTING_VIP_ANCHOR: 'btn-setting-vip-anchor',
  MODAL_SETTING_VIP_ANCHOR: 'modal-setting-vip-anchor',
  SELECT_SETTING_VIP_ANCHOR_ROLE: 'select-setting-vip-anchor-role',
  // Nmixx Forum Settings
  BTN_SETTING_NMIXX_FORUM: 'btn-setting-nmixx-forum',
  MODAL_SETTING_NMIXX_FORUM: 'modal-setting-nmixx-forum',
  SELECT_SETTING_NMIXX_SINGLE_FORUM: 'select-setting-nmixx-single-forum',
  SELECT_SETTING_NMIXX_OTP_FORUM: 'select-setting-nmixx-otp-forum',
  // Nmixx Forum Post
  // Nmixx Forum Post
  BTN_NMIXX_POST_X: 'btn-nmixx-post-x',
  MODAL_NMIXX_POST_X: 'modal-nmixx-post-x',
  BTN_NMIXX_POST_MANUAL: 'btn-nmixx-post-manual',
  MODAL_NMIXX_POST_MANUAL: 'modal-nmixx-post-manual',
  BTN_NMIXX_POST_COLLECTION: 'btn-nmixx-post-collection',
  MODAL_NMIXX_POST_COLLECTION: 'modal-nmixx-post-collection',
  INPUT_NMIXX_TWEET_URL: 'input-tweet-url',
  SELECT_NMIXX_MEMBER_SINGLE: 'select-nmixx-member-single',
  SELECT_NMIXX_MEMBER_OTP: 'select-nmixx-member-otp',
  INPUT_NMIXX_MANUAL_USER: 'input-nmixx-manual-user',
  INPUT_NMIXX_MANUAL_DATE: 'input-nmixx-manual-date',
  UPLOAD_NMIXX_MANUAL_MEDIA: 'upload-nmixx-manual-media',
  INPUT_NMIXX_COLLECTION_THUMBNAIL: 'input-nmixx-collection-thumbnail',

  // Nmixx Music Quiz Settings
  BTN_SETTING_NMIXX_QUIZ: 'btn-setting-nmixx-quiz',
  MODAL_SETTING_NMIXX_QUIZ: 'modal-setting-nmixx-quiz',
  SELECT_SETTING_NMIXX_QUIZ_ANSWER_CHANNEL:
    'select-setting-nmixx-quiz-answer-channel',
  SELECT_SETTING_NMIXX_QUIZ_VOICE_CHANNEL:
    'select-setting-nmixx-quiz-voice-channel'
} as const
