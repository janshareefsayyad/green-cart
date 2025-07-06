import bcrypt from 'bcryptjs'
import User from '../models/User.js';
import jwt from 'jsonwebtoken'

//Register user : /api/user/register

export const register = async(req,res) =>{
    try {
        const {name,email,password} = req.body;

        if(!name || !email || !password){
            return res.json({success:false,message : "Missing Details"})
        }
        const existingUser = await User.findOne({email});
        if(existingUser){
            return res.json({success:false,message : "User already exists"})
        }
        const hashedPassword = await bcrypt.hash(password,10);
        const user = await User.create({name,email,password:hashedPassword})
        const token = jwt.sign({id: user._id},process.env.JWT_SECRET, {expiresIn:'7d'});

        res.cookie('token',token,{
            httpOnly:true,  //Prevent JS to access the cookie
            secure : process.env.NODE_ENV === 'production',//use secured cookie in production
            sameSite : process.env.NODE_ENV === 'production'?'none':'strict', //CRF Protection
            maxAge : 7 * 24 * 60 * 60 * 1000, //cookie expiration time

        })
        return res.json({success:true,user : {email:user.email,name:user.name}});
    } catch (error) {
        console.log(error.message)
        res.json({success:false,message:error.message}); 
    }
}

//Login User : /api/user/login

export const login = async(req,res)=>{
    try {
        const {email,password} =req.body;
        if(!email || !password){
           return res.json({success:false,message:"Email and password are required."}); 
        }
        const user =await User.findOne({email});

        if(!user){
            return res.json({success:false,message:"Email not found. Please sign up first."});
        }

        const isMatch = await bcrypt.compare(password,user.password);
        if(!isMatch){
            return res.json({success:false,message:"Invalid password"});
        }


        const token = jwt.sign({id: user._id},process.env.JWT_SECRET, {expiresIn:'7d'});
        console.log(token);
        res.cookie('token',token,{
            httpOnly:true,  
            secure : process.env.NODE_ENV === 'production',
            sameSite : process.env.NODE_ENV === 'production'?'none':'strict', 
            maxAge : 7 * 24 * 60 * 60 * 1000,

        })
        return res.json({success:true,user : {email:user.email,name:user.name}});
    } catch (error) {
        console.log(error.message)
        res.json({success:false,message:error.message});
    }
}


//check auth : /api/user/is-auth
export const isAuth = async (req,res)=>{
    try {
        const {userId} = req; 
        const user = await User.findById(userId).select("-password")
        return res.json({success:true,user})
    } catch (error) {
        console.log(error.message);
        res.json({ success:false,message:error.message});
    }
}

//logout : /api/user/logout
export const logout = async (req,res)=>{
    try {
        res.clearCookie('token',{
            httpOnly:true,  
            secure : process.env.NODE_ENV === 'production',
            sameSite : process.env.NODE_ENV === 'production'?'none':'strict', 
            maxAge : 7 * 24 * 60 * 60 * 1000,
        });
        return res.json({success:true,message:"Logged out"})
    } catch (error) {
        console.log(error.message);
        res.json({success:false,message:error.message});
    }
}
