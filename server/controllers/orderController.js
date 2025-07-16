import User from "../models/User.js"
import Order from "../models/Order.js"
import Product from "../models/Product.js"
import stripe from 'stripe';    



//place order cod :  /api/order/api

export const placeOrderCOD = async(req,res) =>{
    try {
        const {items,address} = req.body
        const {userId} = req
        if(!address || items.length ===0){
            return res.json({success:false,message:"Invalid data"})
        }
        //calculate amount using items
        let amount = await items.reduce(async(acc,item)=>{
            const product = await Product.findById(item.product)
            return (await acc)+product.offerPrice*item.quantity;
        },0)

        //add tax charge(2%);

        amount += Math.floor(amount * 0.02)

        await Order.create({
            userId,
            items,
            amount,
            address,
            paymentType: "COD"
        });

        return res.json({success:true,message:"Order Placed Successfully"});
    } catch (error) {
        return res.json({success:false,message:error.message});
    }
}


//place order cod :  /api/order/api

export const placeOrderStripe = async(req,res) =>{
    try {
        const {items,address} = req.body
        const {userId} = req
        const {origin} = req.headers;

        if(!address || items.length ===0){
            return res.json({success:false,message:"Invalid data"})
        }
        let productData =[]
        //calculate amount using items
        let amount = await items.reduce(async(acc,item)=>{
            const product = await Product.findById(item.product)
            productData.push({
                name : product.name,
                price:product.offerPrice,
                quantity:item.quantity,
            })
            return (await acc)+product.offerPrice*item.quantity;
        },0)

        //add tax charge(2%);

        amount += Math.floor(amount * 0.02)

        const order = await Order.create({
            userId,
            items,
            amount,
            address,
            paymentType: "Online",
        });

        //Stripe gateway initialize
        const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);

        //create line items for stripe

        const line_items = productData.map((item)=>{
            return {
                price_data: {
                    currency :'inr',
                    product_data:{
                        name : item.name,
                    },
                    unit_amount:Math.floor(item.price * 1.02)*100,
                },
                quantity: item.quantity,
            }
        })
        //create session
        const session = await stripeInstance.checkout.sessions.create({
            line_items,
            mode: 'payment',
            success_url:`${origin}/loader?next=my-orders`,
            cancel_url:`${origin}/cart`,
            metadata :{
                orderId : order._id.toString(),
                userId,
            }
        })

        return res.json({success:true,url:session.url});
    } catch (error) {
        return res.json({success:false,message:error.message});
    }
}


//stripe  webhooks to verify payments action: /stripe

export const stripeWebHooks = async (req, res) => {
    const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);
    const sig = req.headers['stripe-signature'];

    let event;
    try {
        event = stripeInstance.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET,
        );
    } catch (error) {
        console.error(`Webhook Error: ${error.message}`);
        return res.status(400).send(`Webhook Error: ${error.message}`);
    }

    console.log(`Webhook Event Received: ${event.type}`);

    switch (event.type) {

        case "checkout.session.completed": {
            const session = event.data.object;
            const { orderId, userId } = session.metadata || {};

            if (!orderId || !userId) {
                console.error('Metadata missing in checkout.session.completed event');
                break;
            }

            try {
                await Promise.all([
                    Order.findByIdAndUpdate(orderId, { isPaid: true }),
                    User.findByIdAndUpdate(userId, { cartItems: [] })
                ]);

                console.log(`✅ Order ${orderId} marked as paid. Cart cleared for user ${userId}.`);
            } catch (error) {
                console.error(`❌ Error updating DB for checkout.session.completed:`, error.message);
            }

            break;
        }

        case "payment_intent.failed": {
            const paymentIntent = event.data.object;
            const paymentIntentId = paymentIntent.id;

            try {
                const sessions = await stripeInstance.checkout.sessions.list({
                    payment_intent: paymentIntentId,
                    limit: 1
                });

                if (sessions.data.length > 0) {
                    const { orderId } = sessions.data[0].metadata || {};
                    if (orderId) {
                        await Order.findByIdAndDelete(orderId);
                        console.log(`❌ Order ${orderId} deleted due to failed payment.`);
                    }
                }
            } catch (error) {
                console.error("Error processing payment_intent.failed:", error.message);
            }
            break;
        }

        default:
            console.log(`Ignoring unhandled event type: ${event.type}`);
            break;
    }

    return res.json({ received: true });
};




//get Orders by userId : /api/order/user

export const getUserOrders = async(req,res)=>{
    try {
        const {userId} = req;
        const orders = await Order.find({
            userId,
            $or:[{paymentType:'COD'},{isPaid:true}]
        }).populate('items.product address').sort({createdAt: -1});
        return res.json({success:true,orders});
    } catch (error) {
        return res.json({success:false,message:error.message});
    }
}

//get All Orders for (seller/admin) :  /api/order/seller

export const getAllOrders = async(req,res)=>{
    try {
        const orders = await Order.find({
            $or:[{paymentType:'COD'},{isPaid:true}]
        }).populate('items.product address').sort({createdAt: -1});
        return res.json({success:true,orders});
    } catch (error) {
        return res.json({success:false,message:error.message});
    }
}
