'use strict';
const PUBLIC_CODES=new Set(['FEATURE_DISABLED','EXPERIENCE_NOT_AVAILABLE','SESSION_NOT_FOUND','SESSION_OWNERSHIP_MISMATCH','CHILD_OWNERSHIP_MISMATCH','SESSION_REVISION_CONFLICT','IDEMPOTENCY_CONFLICT','CONTENT_RELEASE_NOT_FOUND','CONTENT_RELEASE_RETIRED','CONTENT_RELEASE_SAFETY_WITHDRAWN','PINNED_EXPERIENCE_NOT_FOUND','INVALID_STORED_SESSION_STATE','REDUCER_REJECTED_ACTION','EVENT_SEQUENCE_CONFLICT','VALIDATION_FAILED','PERSISTENCE_TRANSACTION_FAILED','SERVICE_UNAVAILABLE']);
class GatesV2ServiceError extends Error{constructor(code,message=code,details){super(message);this.name='GatesV2ServiceError';this.code=PUBLIC_CODES.has(code)?code:'SERVICE_UNAVAILABLE';if(details)this.details=details;}}
function safeServiceError(error){if(error instanceof GatesV2ServiceError)return error;return new GatesV2ServiceError(PUBLIC_CODES.has(error?.code)?error.code:'SERVICE_UNAVAILABLE');}
module.exports={GatesV2ServiceError,safeServiceError,PUBLIC_CODES};
