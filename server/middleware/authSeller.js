import jwt from "jsonwebtoken";


//Seller auth : /api/seller/is-auth

const authSeller = async (req, res, next) => {
  
  const { sellerToken } = req.cookies;

  if (!sellerToken) {
    return res.json({ success: false, message: "Not Authorized" });
  }
  console.log(sellerToken);
  try {
    const tokenDecode = jwt.verify(sellerToken, process.env.JWT_SECRET);
    if (tokenDecode.email===process.env.SELLER_EMAIL) {
      return next(); 
    } else {
      return res.json({ success: false, message: "Not Authorized" });
    }  
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

export default authSeller
