import { Router } from 'express'
import { requireAuth } from '../middleware/auth.middleware.js'
import { requireRole } from '../middleware/role.middleware.js'
import { ApiError } from '../middleware/error.middleware.js'
import {
  createAgreement,
  deleteAgreement,
  deleteAgreementDocument,
  getAgreement,
  getAgreementDocumentFile,
  getAgreementWorkflowState,
  getFinalAgreementFile,
  listAgreementDocuments,
  listAgreements,
  updateAgreement,
  uploadAgreementDocument,
  uploadFinalAgreement,
  verifyAgreementDocument,
} from '../services/agreement.service.js'
import {
  agreementIdSchema,
  createAgreementSchema,
  updateAgreementSchema,
  uploadAgreementDocumentSchema,
  uploadFinalAgreementSchema,
  verifyAgreementDocumentSchema,
} from '../validation/agreement.schema.js'

export const agreementRouter = Router()

agreementRouter.get('/', requireAuth, async (req, res) => {
  const user = req.user
  if (!user) throw new ApiError(401, 'Authentication required')
  const agreements = await listAgreements(user)
  res.status(200).json({ agreements })
})

agreementRouter.get('/:id', requireAuth, async (req, res) => {
  const user = req.user
  if (!user) throw new ApiError(401, 'Authentication required')
  const id = agreementIdSchema.parse(req.params.id)
  const agreement = await getAgreement(user, id)
  res.status(200).json({ agreement })
})

agreementRouter.get('/:id/workflow', requireAuth, async (req, res) => {
  const user = req.user
  if (!user) throw new ApiError(401, 'Authentication required')
  const id = agreementIdSchema.parse(req.params.id)
  const workflow = await getAgreementWorkflowState(user, id)
  res.status(200).json({ workflow })
})

agreementRouter.post(
  '/',
  requireAuth,
  requireRole('TENANT', 'BUYER'),
  async (req, res) => {
    const user = req.user
    if (!user) throw new ApiError(401, 'Authentication required')
    const input = createAgreementSchema.parse(req.body)
    const agreement = await createAgreement(user, input)
    res.status(201).json({ message: 'Agreement created', agreement })
  },
)

agreementRouter.patch('/:id', requireAuth, async (req, res) => {
  const user = req.user
  if (!user) throw new ApiError(401, 'Authentication required')
  const id = agreementIdSchema.parse(req.params.id)
  const input = updateAgreementSchema.parse(req.body)
  const agreement = await updateAgreement(user, id, input)
  res.status(200).json({ message: 'Agreement updated', agreement })
})

agreementRouter.delete('/:id', requireAuth, async (req, res) => {
  const user = req.user
  if (!user) throw new ApiError(401, 'Authentication required')
  const id = agreementIdSchema.parse(req.params.id)
  await deleteAgreement(user, id)
  res.status(200).json({ message: 'Agreement deleted' })
})

agreementRouter.get('/:id/documents', requireAuth, async (req, res) => {
  const user = req.user
  if (!user) throw new ApiError(401, 'Authentication required')
  const id = agreementIdSchema.parse(req.params.id)
  const documents = await listAgreementDocuments(user, id)
  res.status(200).json({ documents })
})

agreementRouter.get('/:id/documents/:documentId/file', requireAuth, async (req, res) => {
  const user = req.user
  if (!user) throw new ApiError(401, 'Authentication required')
  const id = agreementIdSchema.parse(req.params.id)
  const documentId = agreementIdSchema.parse(req.params.documentId)
  const file = await getAgreementDocumentFile(user, id, documentId)
  res.status(200).json({
    fileName: file.fileName,
    fileData: file.fileData,
    fileMimeType: file.fileMimeType,
  })
})

agreementRouter.post('/:id/documents', requireAuth, async (req, res) => {
  const user = req.user
  if (!user) throw new ApiError(401, 'Authentication required')
  const id = agreementIdSchema.parse(req.params.id)
  const input = uploadAgreementDocumentSchema.parse(req.body)
  const document = await uploadAgreementDocument(user, id, input)
  res.status(201).json({ message: 'Document uploaded', document })
})

agreementRouter.delete('/:id/documents/:documentId', requireAuth, async (req, res) => {
  const user = req.user
  if (!user) throw new ApiError(401, 'Authentication required')
  const id = agreementIdSchema.parse(req.params.id)
  const documentId = agreementIdSchema.parse(req.params.documentId)
  await deleteAgreementDocument(user, id, documentId)
  res.status(200).json({ message: 'Document removed' })
})

agreementRouter.patch(
  '/:id/documents/:documentId/verify',
  requireAuth,
  requireRole('ADMIN'),
  async (req, res) => {
    const user = req.user
    if (!user) throw new ApiError(401, 'Authentication required')
    const id = agreementIdSchema.parse(req.params.id)
    const documentId = agreementIdSchema.parse(req.params.documentId)
    const input = verifyAgreementDocumentSchema.parse(req.body)
    const document = await verifyAgreementDocument(user, id, documentId, input)
    res.status(200).json({ message: 'Document verification updated', document })
  },
)

agreementRouter.post(
  '/:id/final-agreement',
  requireAuth,
  requireRole('ADMIN'),
  async (req, res) => {
    const user = req.user
    if (!user) throw new ApiError(401, 'Authentication required')
    const id = agreementIdSchema.parse(req.params.id)
    const input = uploadFinalAgreementSchema.parse(req.body)
    const agreement = await uploadFinalAgreement(user, id, input)
    res.status(201).json({
      message: 'Final legal agreement uploaded',
      agreement,
    })
  },
)

agreementRouter.get('/:id/final-agreement', requireAuth, async (req, res) => {
  const user = req.user
  if (!user) throw new ApiError(401, 'Authentication required')
  const id = agreementIdSchema.parse(req.params.id)
  const file = await getFinalAgreementFile(user, id)
  res.status(200).json(file)
})
