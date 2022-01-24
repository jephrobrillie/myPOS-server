const { Product } = require('../models/product');
const express = require('express');
const { Category } = require('../models/category');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');


const FILE_TYPE_MAP = {
    'image/png': 'png',
    'image/jpg': 'jpg',
    'image/jpeg': 'jpeg'
}
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const isvalid = FILE_TYPE_MAP[file.mimetype]
        let uploadError = new Error('invalid image type')

        if(isvalid){
            uploadError = null
        }
        cb(uploadError, './public/uploads')
    },
    filename: function (req, file, cb) {
        const filename = file.originalname.split(' ').join('-'); //or replace(' ',''-')
        const extension = FILE_TYPE_MAP[file.mimetype]
        cb(null, `${filename}-${Date.now()}.${extension}`)
    }
  })
   
  const uploadOptions = multer({ storage: storage })


//with populate & query params ex. ?categories=1234,2345
router.get(`/`, async (req, res) => {
    let filter = {};
    if (req.query.categories){
        filter = {category: req.query.categories.split(',')}
    }
    const productList = await Product.find(filter).populate('category');
    if (!productList) {
        res.status(500).json({ success: false })
    }
    res.send(productList);
})

//select
router.get(`/select`, async (req, res) => {
    const productList = await Product.find().select('name image -_id');
    if (!productList) {
        res.status(500).json({ success: false })
    }
    res.send(productList);
})

router.get(`/:id`, async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (!product) {
        res.status(500).json({ success: false })
    }
    res.send(product);
})

router.post(`/`, uploadOptions.single('image'), async (req, res) => {
    const category = await Category.findById(req.body.category);
    if (!category) return res.status(400).send('Invalid Category')

    const file = req.file
    if(!file) {
        return res.status(400).send('no image in the request')
    }
    const filename = req.file.filename
    const basePath = `${req.protocol}://${req.get('host')}/public/uploads/`

    let product = new Product({
        name: req.body.name,
        description: req.body.description,
        richDescription: req.body.richDescription,
        image: `${basePath}${filename}`, //"http:localhost:3000/public/uploads/image-203982.jpeg"
        brand: req.body.brand,
        price: req.body.price,
        category: req.body.category,
        countInStock: req.body.countInStock,
        rating: req.body.rating,
        numReviews: req.body.numReviews,
        isFeatured: req.body.isFeatured
    })

    product = await product.save();

    if (!product)
        return res.status(500).send('The product cannot be created.')

    res.send(product);
})

router.put(`/:id`, async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        res.status(400).send('Invalid Product ID')
    }
    const category = await Category.findById(req.body.category);
    if (!category) return res.status(400).send('Invalid Category')

    const product = await Product.findByIdAndUpdate(
        req.params.id,
        {
            name: req.body.name,
            description: req.body.description,
            richDescription: req.body.richDescription,
            image: req.body.image,
            brand: req.body.brand,
            price: req.body.price,
            category: req.body.category,
            countInStock: req.body.countInStock,
            rating: req.body.rating,
            numReviews: req.body.numReviews,
            isFeatured: req.body.isFeatured
        },
        { new: true }
    )
    
    if (!product)
        return res.status(500).send('the product cannot be updated!')

    res.send(product);
})

router.delete('/:id', (req, res) => {
    Product.findByIdAndRemove(req.params.id).then(product => {
        if (product) {
            return res.status(200).json({
                success: true,
                message: 'the product was deleted!'
            })
        } else {
            return res.status(404).json({
                success: false,
                message: 'product not found'
            })
        }
    }).catch(err => {
        return res.status(404).json({
            success: false,
            error: err
        })
    })
})

//count
router.get(`/get/count`, async (req, res) => {
    const productCount = await Product.countDocuments((count) => count);

    if (!productCount) {
        res.status(500).json({ success: false })
    }
    res.send({
        productCount:productCount
    });
})

//featured
router.get(`/get/featured`, async (req, res) => {
    const productFeatured = await Product.find({isFeatured: true});

    if (!productFeatured) {
        res.status(500).json({ success: false })
    }
    res.send(productFeatured);
})

//limit
router.get(`/get/featured/:limit`, async (req, res) => {
    const limit = req.params.limit ? req.params.limit : 1
    const productFeatured = await Product.find({isFeatured: true}).limit(+limit);

    if (!productFeatured) {
        res.status(500).json({ success: false })
    }
    res.send(productFeatured);
})

router.put(
    `/gallery-images/:id`, 
    uploadOptions.array('images', 3), 
    async (req, res) => {
        if (!mongoose.isValidObjectId(req.params.id)) {
           return res.status(400).send('Invalid Product ID')
        }

        const files = req.files
        let imagesPaths = [];
        const basePath = `${req.protocol}://${req.get('host')}/public/uploads/`;

        if(files){
            files.map(file =>{
                imagesPaths.push(`${basePath}${file.filename}`);
            })
        }

        const product = await Product.findByIdAndUpdate(
            req.params.id,
            {
                images: imagesPaths
            },
            { new: true }
        )

        if (!product)
            return res.status(500).send('the product cannot be updated!')

        res.send(product);
    }
)


module.exports = router;