import Joi from 'joi'
import GlobalSchema from '~/libs/utils/Global.schema'

let schema = {}

// Get Bills

schema.getBillsParams = Joi.object().keys({
  id: Joi.string()
})

schema.getBillUploadUrlParams = Joi.object().keys({
  congress: Joi.number()
    .integer()
    .min(1)
    .required(),
  billType: Joi.string().required(),
  billNumber: Joi.number()
    .integer()
    .min(1)
    .required(),
  versionType: Joi.string().required(),
  versionDate: Joi.string().required(),
  contentType: Joi.string().required()
})

let validate = {}

validate.getBillsParams = GlobalSchema.validate.promisify(schema.getBillsParams)
validate.getBillUploadUrlParams = GlobalSchema.validate.promisify(schema.getBillUploadUrlParams)

export default {
  schema,
  validate
}
