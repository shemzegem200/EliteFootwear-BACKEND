const express = require('express');
const mongoose=require('mongoose');
const Product = require('./models/product.model.js');
const Customer = require('./models/customer.model.js');
const Order = require('./models/order.model.js');
const Fuse = require('fuse.js');
const bcrypt = require('bcrypt');
const cors = require("cors");
const jwt = require("jsonwebtoken");
const CookieParser = require('cookie-parser');
//needed to send email
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');

//secret string for hashing the web token
const secret = "sadv12c1w4cjnqgvui3b4v19px";


const cloudinary = require('./utils/cloudinary.js');


//middleware
const allowedOrigins = [
  'https://66a4c967744d33fb296aad6a--astounding-daifuku-5c2ff7.netlify.app'
];
// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};


const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors(corsOptions));
app.use(CookieParser());


//connect
app.listen(4000,()=>{
    console.log("Server running on port 4000");
});


//testing
app.get('/test', (req, res)=>{
    res.status(200).json({result: true});
});


// endpoint to check if the user is logged in
app.get("/api/profile", (req, res) => {
    //res.json(req.cookies);
    const {token} = req.cookies;
    jwt.verify(token, secret, {}, (err, info) => {
        if (err) throw err;
        res.json(info);
    });
});


//endpoint to logout
app.post("/api/logout", (req, res) => {
    res.cookie('token', '').json('ok');
});


//____________________________________________________________________________________________________SHOES CRUD
//get all shoes for index page
app.get('/api/products',async(req,res)=>{
    const arrOfPrdts = await Product.find({});
    res.status(200).json(arrOfPrdts);
});


//get shoe based on id
app.get('/api/product/:id',async(req,res)=>{
    const {id} =req.params;

    const array=await Product.findById(id);
    res.status(200).json(array);
});



//add shoe to table
app.post('/api/products', async (req, res) => {
    try {
      const { name, sizes, category, description, price, photos } = req.body;
  
      const photoUploads = await Promise.all(photos.map(async (base64Image) => {
        // Upload Base64 image to Cloudinary
        const uploadResult = await cloudinary.uploader.upload(base64Image, { folder: 'shoepics' });
        return {
          public_id: uploadResult.public_id,
          url: uploadResult.secure_url
        };
      }));
  
      const product = await Product.create({
        name,
        price,
        photos: photoUploads,
        category,
        sizes,
        description
      });
  
      res.status(200).json(product);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

//update product
app.put("/api/product/:id",async(req,res)=>{
    try{
        const { id } = req.params;
        const { name, sizes, category, description, price, photos } = req.body;

        const base64Images = photos.filter(file => !file.url);
        const cloudinaryFiles = photos.filter(file => file.url)

        const photoUploads = await Promise.all(base64Images.map(async (base64Image) => {
            // Upload Base64 image to Cloudinary
            const uploadResult = await cloudinary.uploader.upload(base64Image, { folder: 'shoepics' });
            return {
              public_id: uploadResult.public_id,
              url: uploadResult.secure_url
            };
          }));

        const allPhotos = [...cloudinaryFiles, ...photoUploads];

        const updatedProduct = await Product.findByIdAndUpdate(id, {
            name,
            sizes,
            category,
            description,
            price,
            photos: allPhotos
        }, { new: true });
        
        if(!updatedProduct){
            return res.status(404).json({message:"Product not Found"});
        }
        res.status(200).json(updatedProduct);
    }
    catch(error){
        res.status(500).json({message:error.message});
    }
});

//delete a product
app.delete("/api/product/:id",async(req,res)=>{
    try{
        const {id}=req.params;
        const arr=await Product.findByIdAndDelete(id);
        res.status(200).json(arr);
    }
    catch(error){
        res.status(500).json({message:error.message})
    }
});


// FUZZY Search for product (USED FOR NON EXACT MATCHES)
app.post('/api/products/search', async (req, res) => {
    const query = req.body.query; // Access the query from the request body

    if (!query) {
        return res.status(400).json({ message: 'Search term is required' });
    }

    try {
        // Retrieve all products
        const products = await Product.find();

        // Setup Fuse.js for fuzzy search
        const options = {
            includeScore: true,
            keys: ['name']
        };
        const fuse = new Fuse(products, options);

        // Perform the search
        const result = fuse.search(query); // Use query instead of input

        // Extract the actual product data from the result
        const matchedProducts = result.map(res => res.item);

        res.status(200).json(matchedProducts);
    } catch (error) {
        console.error('Error searching for products:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

//non-fuzzy (EXACT SEARCH)
app.post('/api/exactsearch', async(req,res)=>{
    const query = req.body.query;
    if (!query) {
        return res.status(400).json({ message: 'Search term is required' });
    }
    try {
        // Retrieve all products
        const products = await Product.find({});

        // Retrive the first matched shoe name
        for (const record of products){
            if (record.name.includes(query)) return res.status(200).json(record);
        }

        let objectId;
        if (/^[0-9a-fA-F]{24}$/.test(query)) { // Checks if the query is a valid ObjectId format
            objectId = new mongoose.Types.ObjectId(query); // or mongoose.Types.ObjectId(query)
            //if reached here, then no match by name
            //so we must search by id
            const product = await Product.findById(objectId);
            res.status(200).json(product);
        }
        else{
            throw new Error('Invalid id');
        }
    } catch (error) {
        console.error('Error searching for products:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});



//____________________________________________________________________________________________________CUSTOMERS CRUD

//getting all customers
app.get("/api/customers", async(req, res)=>{
    try{
        const arr=await Customer.find({});
        res.status(200).json(arr);
    }
    catch(error){
            res.status(500).json({message:error.message});
    }
});

//getting all orders
app.get("/api/orders", async(req, res)=>{
    try{
        const arr=await Order.find({});
        res.status(200).json(arr);
    }
    catch(error){
            res.status(500).json({message:error.message});
    }
});

//getting orders based on _id
app.get("/api/orders/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const order = await Order.findById(id).select('shoes selectedSize quantity').exec();
        
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const allShoes = await Promise.all(order.shoes.map(async (shoeId, index) => {
            const shoe = await Product.findById(shoeId).exec();
            return { shoe, size: order.selectedSize[index], quantity: order.quantity[index] };
        }));

        res.status(200).json(allShoes);
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});



//adding a customer
app.post('/api/customers',async(req,res)=>{
    try{
        req.body.phone = parseInt(req.body.phone);
        req.body.quantity = req.body.quantity.map(item => parseInt(item));
        const cust=await Customer.create(req.body);
        res.status(200).json(cust);
    }
    catch(error){
            res.status(500).json({message:error.message});
    }
});


//validate login
app.post('/api/customer/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log(email, password);

        // Validate email and password fields
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Please provide email and password' });
        }

        // Find the customer by email
        const customer = await Customer.findOne({ email: email });
        if (!customer) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        // Compare the provided password with the stored hashed password
        const isMatch = await bcrypt.compare(password, customer.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }
        const payload = {
            name: customer.name,
            email: customer.email,
            password: password,
            phone: customer.phone,
            favorites: customer.favorites,
            cart: customer.cart,
            selectedSize: customer.selectedSize,
            quantity: customer.quantity
        };
        // Return true if credentials are valid
        jwt.sign(payload, secret, {expiresIn:'1h'}, (err, token) => {
            if (err) throw err;
            //send the token as a cookie
            res.cookie('token', token, {
                secure: true, /*true only for production*/
                sameSite: 'None',
                httpOnly: true
            }).json(customer);
        });
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});


//get favorites given an input array of id's
app.post("/api/customer/getfavorites", async (req, res) => {
    try {
        const arr = req.body;
        
        // Use Promise.all to handle multiple asynchronous operations concurrently
        const favShoes = await Promise.all(arr.map(id => Product.findById(id)));

        res.status(200).json(favShoes);
    } catch (error) {
        console.error('Error during fetching favorites:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

//get cart items given an input array of id's
app.post("/api/customer/getcart", async (req, res) => {
    try {
        const arr = req.body;
        
        // Use Promise.all to handle multiple asynchronous operations concurrently
        const CartShoes = await Promise.all(arr.map(id => Product.findById(id)));

        res.status(200).json(CartShoes);
    } catch (error) {
        console.error('Error during fetching favorites:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

//update a customer
app.post("/api/particularcustomer", async (req, res) => {
    try {
        // Parse phone number if present
        if (req.body.phone) {
            req.body.phone = parseInt(req.body.phone);
        }
        if (req.body.quantity) {
            req.body.quantity = parseInt(req.body.quantity);
        }

        // Extract fields to update, excluding password
        const { name, phone, email, favorites, cart, selectedSize, quantity } = req.body;

        // Use $set operator to update only specified fields
        const updateFields = {
            ...(name !== undefined && { name }),
            ...(phone !== undefined && { phone }),
            ...(email !== undefined && { email }),
            ...(favorites !== undefined && { favorites }),
            ...(cart !== undefined && { cart }),
            ...(selectedSize !== undefined && { selectedSize }),
            ...(quantity !== undefined && { quantity })    
        };

        // Ensure that at least one field is provided for update
        if (Object.keys(updateFields).length === 0) {
            return res.status(400).json({ message: "No fields provided for update" });
        }

        // Find and update the customer
        const updatedCustomer = await Customer.findOneAndUpdate(
            {email},
            { $set: updateFields },
            { new: true, runValidators: true }
        );

        if (!updatedCustomer) {
            return res.status(404).json({ message: "Customer not found" });
        }

        res.status(200).json(updatedCustomer);
    } catch (error) {
        console.error('Error updating customer:', error);
        res.status(500).json({ message: error.message });
    }
});


//api call to place an order
app.post("/api/placeorder", async(req, res)=>{
    try{
        const response = await Order.create(req.body);
        res.status(200).json(response);
    } catch (error) {
        console.error('Error updating customer:', error);
        res.status(500).json({ message: error.message });
    }
});


//getting popular items
app.get("/api/customers/fav", async (req, res) => {
    try {
        let allfav = [];

        // Find all customers
        const allcust = await Customer.find({});

        console.log("All customers with populated favorites:", allcust); // Debugging statement

        allcust.forEach(custom => {
            custom.favorites.forEach(favor => {
                if (favor) {
                    allfav.push(favor);
                }
            });
        });

        console.log("All favorites:", allfav); // Debugging statement

        // Group favorite products by their count
        const groupedFavorites = allfav.reduce((acc, productId) => {
            const productIdStr = productId.toString();
            if (!acc[productIdStr]) {
                acc[productIdStr] = { productId, count: 0 };
            }
            acc[productIdStr].count++;
            return acc;
        }, {});

        // Convert groupedFavorites object to an array of { productId, count } objects
        const groupedFavoritesArray = Object.values(groupedFavorites);

        // Sort the grouped favorites array by count in descending order
        groupedFavoritesArray.sort((a, b) => b.count - a.count);

        console.log("Grouped and sorted favorites:", groupedFavoritesArray); // Debugging statement

        // Retrieve product names for each product ID
        let f = [];
        for (const item of groupedFavoritesArray) {
            console.log(`Querying product ID: ${item.productId}`); // Debugging statement
            const productDetail = await Product.findById(item.productId).select('name');
            if (productDetail) {
                f.push({ name: productDetail.name, count: item.count, });
            } else {
                console.warn(`Product not found for ID: ${item.productId}`);
            }
        }

        console.log("Detailed favorites with product names:", f); // Debugging statement

        res.status(200).json(f);
    } catch (error) {
        console.error("Error:", error); // Log the error for debugging
        res.status(500).json({ message: error.message });
    }
});


//connect to database
mongoose.connect("mongodb+srv://sachinrangabaskar344:abcd@backend.4d6ywoo.mongodb.net/?retryWrites=true&w=majority&appName=backend")
  .then(() => console.log('Connected!'))
.catch(()=>{
    console.log("Connection Failed");
});
