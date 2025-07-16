import cookieParser from 'cookie-parser';
import express from 'express';
import cors from 'cors';
import connectDB from './configs/db.js';
import 'dotenv/config';
import userRouter from './routes/userRoute.js';
import sellerRouter from './routes/sellerRoute.js';
import connectCloudinary from './configs/cloudinary.js';
import cartRouter from './routes/cartRoute.js';
import addressRouter from './routes/addressRoute.js';
import orderRouter from './routes/orderRoute.js';
import productRouter from './routes/productRoute.js';
import { stripeWebHooks } from './controllers/orderController.js';

const app = express();
const port = process.env.PORT || 4000;

await connectDB();
await connectCloudinary();

//Allow multiple Origins
const allowedOrigins = ['http://localhost:5173',process.env.CLIENT_ORIGIN];

//Middleware Configuration
app.use((req, res, next) => {
  if (req.originalUrl === '/stripe') {
    // Don't parse webhook requests as JSON
    next();
  } else {
    // Parse all other requests as JSON
    express.json()(req, res, next);
  }
});
app.use(cookieParser());
app.use(cors({origin: allowedOrigins,credentials:true}));

app.post("/stripe",express.raw({type:'application/json'}),stripeWebHooks)

app.get("/",(req,res) => {
    res.send("api is working")
});

app.use("/api/user",userRouter)
app.use("/api/seller",sellerRouter)
app.use("/api/product",productRouter)
app.use("/api/cart",cartRouter)
app.use("/api/address",addressRouter)
app.use("/api/order",orderRouter)
app.listen(port,()=>{
    console.log(`server is running on http://localhost:${port}`);
});
