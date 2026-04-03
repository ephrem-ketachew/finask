import express from 'express';
import { getMultiSearchResults } from '../controllers/searchController.js';

const router = express.Router();

router.get('/', getMultiSearchResults);

export default router;
