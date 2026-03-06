const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.get("/", productController.getProducts);
router.get("/all-products", productController.getAllProducts);
router.get("/search", productController.searchProducts);

router.patch('/:id', productController.updateProduct);
router.delete('/:id', productController.deleteProduct);

router.get('/:idOrSlug', productController.getDetail);
router.get('/:idOrSlug/reviews', productController.getReviews);
router.get('/:idOrSlug/ratings-summary', productController.getRatingsSummary);
router.get('/:idOrSlug/related', productController.getRelated);
router.post('/:id/size-match', verifyToken, productController.sizeMatch);




module.exports = router;