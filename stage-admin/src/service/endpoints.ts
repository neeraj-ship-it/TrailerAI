export const endpoints = {
  refund: {
    getTransactionDetails: "admin/refund/transactions",
    initiateRefund: "admin/refund/initiate",
  },
  auth: {
    verifyToken: "admin/user/verify",
    login: "admin/user/login",
  },
  pg: {
    config: "admin/appSetting/config",
  },
  variant: {
    getVariants: "v25/adminHome/getVariants",
    getVariantById: "v25/adminHome/getVariantById",
    getRows: "v25/adminHome/getRows",
    updateVariant: "v25/adminHome/updateVariant",
  },
  categories: {
    getGenres: "v25/adminHome/getGenres",
    getSubGenres: "v25/adminHome/getSubGenres",
    getThemes: "v25/adminHome/getThemes",
    getMoods: "v25/adminHome/getMoods",
    getDescriptorTags: "v25/adminHome/getDescriptorTags",
  },
  content: {
    getAllContents: "v25/adminHome/allContents",
  },
  row: {
    create: "v25/adminHome/createRow",
    update: "v25/adminHome/updateRow",
    getRow: "v25/home/getRow",
  },
  platter: {
    getContent: "cms/platter/content",
    updatePlatter: "cms/platter/update",
    getPlatter: "cms/platter/details",
  },
  deeplink: {
    getContentData: "admin/content/deeplink",
  },
  censorBoard: {
    base: "cms/content-censor",
    listContents: "cms/content-censor/list-contents",
  },
  videoQc: {
    list: "cms/video-qc",
    reportUploadProgress: "cms/video-qc/report-upload-progress",
    initiate: "cms/video-qc/initiate",
    progress: (projectId: string) => `cms/video-qc/progress/${projectId}`,
    getById: (id: string) => `cms/video-qc/${id}`,
  },
  trailer: {
    list: "cms/trailer/projects",
    create: "cms/trailer/project",
    getById: (projectId: string) => `cms/trailer/project/${projectId}`,
    status: (projectId: string) => `cms/trailer/status/${projectId}`,
    generate: "cms/trailer/generate",
    reportUploadProgress: "cms/trailer/report-upload-progress",
    generateUploadUrl: "cms/trailer/upload-url/create",
    completeMultipartUpload: "cms/trailer/complete-multipart-upload",
    // NEW: Narrative workflow endpoints
    draftNarrative: "cms/trailer/draft-narrative",
    getNarrative: (projectId: string) => `cms/trailer/narrative/${projectId}`,
    approveNarrative: "cms/trailer/approve-narrative",
    narrativeStatus: (projectId: string) => `cms/trailer/narrative-status/${projectId}`,
  },
  clipExtractor: {
    list: "cms/clip-extractor/projects",
    create: "cms/clip-extractor/project",
    extract: (projectId: string) => `cms/clip-extractor/extract/${projectId}`,
    getById: (projectId: string) => `cms/clip-extractor/project/${projectId}`,
    status: (projectId: string) => `cms/clip-extractor/status/${projectId}`,
  },
  files: {
    generateUploadUrl: "cms/files/video-qc/upload-url/create",
    generateVideoUploadUrl: (contentType: string) =>
      `cms/files/${contentType}/upload-url/video/create`,
    extractFrames: "cms/files/extract-frames",
    generatePoster: "cms/files/generate-poster",
    rawMediaStatus: "cms/files/raw-media/status",
    frameUploadUrl: "cms/files/frame/upload-url",
    frameReportStatus: "cms/files/frame/report-status",
    completeMultipartUpload: "cms/files/complete-multipart-upload",
  },
};
