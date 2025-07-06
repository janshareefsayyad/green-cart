import { createContext,useContext, useEffect, useRef, useState } from "react";
import {useNavigate} from 'react-router-dom'
import { dummyProducts } from "../assets/assets";
import toast from "react-hot-toast";
import axios from 'axios';

axios.defaults.withCredentials = true;
axios.defaults.baseURL = import.meta.env.VITE_BACKEND_URL;

export const AppContext = createContext();

export const AppContextProvider = ({children}) =>{
    const currency = import.meta.env.VITE_CURRENCY;
    const navigate = useNavigate();
    const [user,setUser]=useState(null);
    const [isSeller,setIsSeller]=useState(false);
    const [showUserLogin,setShowUserLogin] = useState(false);
    const [products,setProducts] = useState([]);
    const [cartItems,setCartItems] = useState({});
    const [searchQuery,setSearchQuery] = useState("");


    //fetch seller status
    const fetchSeller = async()=>{
        try {
            const {data} = await axios.get('/api/seller/is-auth');
            if(data.success){
                setIsSeller(true);
            }else{
                setIsSeller(false);
            }
        } catch (error) {
            setIsSeller(false);
        }
    }

        //fetch user status and cart items
    const fetchUser = async()=>{
        try {
            const {data} = await axios.get('/api/user/is-auth',{withCredentials: true,});
            if(data.success){
                setUser(data.user);
                setCartItems(data.user.cartItems);
            }
        } catch (error) {
            setUser(null);
        }
    }

    //fetch product
    const fetchProducts = async () => {
        try {
            const {data} = await axios.get('/api/product/list')
            if(data.success){
                setProducts(data.products);
            }else{
                toast.error(data.message);
            }
        } catch (error) {
            toast.error(error.message);
        }
    }

    //add product to cart
    const addToCart = (itemId)=>{
        let cartData = structuredClone(cartItems);
        if(cartData[itemId]){
            cartData[itemId] +=1;
        }else{
            cartData[itemId] = 1;
        }
        setCartItems(cartData);
        toast.success("Added to Cart")
    }
    //update cartitem quantity

    const updateCartItems = (itemId,quantity) =>{
        let cartData = structuredClone(cartItems);
        cartData[itemId] = quantity;
        setCartItems(cartData);
        toast.success("cart Updated")
    }
    useEffect(()=>{
        fetchProducts();
        fetchSeller();
        fetchUser();
    },[]);


    useEffect(()=>{
        const updateCart = async()=>{
            try {
                const {data} = await axios.post('/api/cart/update',{cartItems});
                if(!data.success){
                    toast.error(data.message);
                }
            } catch (error) {
                toast.error(error.message);
            }
        }

        if(user){
            updateCart();
        }
    },[cartItems])
    //remove product from cart
    const removeFromCart =(itemId)=>{
        let cartData = structuredClone(cartItems);
        if(cartData[itemId]){
            cartData[itemId] -= 1;
            if(cartData[itemId]===0){
                delete cartData[itemId];
            }
        }
        toast.success("Removed from cart");
        setCartItems(cartData);
    }
    //get cart item count
    const getCartCount = ()=>{
        let totalCount=0;
        for(const item in cartItems){
            totalCount += cartItems[item];
        }
        return totalCount;
    }

    //get cart total amount
    const getCartAmount =()=>{
        let totalAmount=0;
        for(const item in cartItems){
            let itemInfo = products.find((product)=> product._id === item);
            if(cartItems[item]>0){
                totalAmount += itemInfo.offerPrice * cartItems[item];
            }
        }
        return Math.floor(totalAmount*100)/100;
    }
    const value ={navigate,user,setUser,isSeller,setIsSeller,showUserLogin,setShowUserLogin,
        products,currency,addToCart,updateCartItems,removeFromCart,cartItems,searchQuery,
        setSearchQuery,getCartAmount,getCartCount,axios,fetchProducts,setCartItems }
    return <AppContext.Provider value ={value}>
        {children}
    </AppContext.Provider>
}

export const useAppContext = ()=>{
    return useContext(AppContext);
}
