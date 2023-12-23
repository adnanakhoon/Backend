import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";


const generateAccessAndRefreshTokens = async(userId) =>{
  try {

      const user = await User.findById(userId)
      const accessToken = user.generateAccessToken()
      const refreshToken = user.generateRefreshToken()

      user.refreshToken = refreshToken
      await user.save({validateBeforeSave : false})

      return {refreshToken,accessToken}
    
  } catch (error) {
    throw new ApiError(500,"something went wrong while generating access and refresh tokens")
  }
}


  // get user details from frontend through postman
  // validation empty fields
  // check if user already exists through email ,username
  // check for images especially on avatar
  // upload them to cloudinary , avatar
  // create user object - create entry in db
  // remove password and refreshtoken fields from response
  // check for user creation(object)
  // return response

  const registerUser = asyncHandler(async (req, res) => {

  const { fullName, email, userName, password } = req.body;
  
//   console.log("email", email);

  //  if(fullName === ""){
  //     throw new ApiError(400,"fullname is required")
  //  }

  if (
    [fullName, email, password, userName].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const existedUsername = await User.findOne({
    $or: [{ userName }],
  });
  const existedEmail = await User.findOne({
    $or: [{ email }],
  });
  if (existedUsername) {
    throw new ApiError(409, "User with  username already exists ");
  } else if (existedEmail) {
    throw new ApiError(409, "User with email  already exists ");
  }

  // console.log(req.files)

  const avatarLocalPath = req.files?.avatar[0]?.path;
  // const coverImageLocalPath = req.files?.coverImage[0]?.path;

  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required")
  }
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar file is required")
  }

  const user = await User.create({
    userName: userName.toLowerCase(),
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    fullName,
  })

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  )
  if (!createdUser) {
    throw new ApiError(500, "something went wrong while registering the user");
  }

  return res.status(201)
    .json(new ApiResponse(200, createdUser, "User registered successfully"));
})


const loginUser = asyncHandler(async(req,res)=>{
// req.body --> data
// login through username or email  
// find the user from database
// password check if used is present
// access and refresh token generating 
// send cookie

  const{email,username, password} = req.body

  if(!email || username){
    throw new ApiError(400,"username or password is required")
  }

  const user = await User.findOne({
    $or:[{email}, {username}]
  })

  if(!user){
    throw new ApiError(404,'Invalid credentials')
  }

   const isPasswordValid = await user.isPasswordCrrect(password)

   if(!isPasswordValid){
    throw new ApiError(404,"Invalid Password")
   }

     const {accessToken,refreshToken} = await generateAccessAndRefreshTokens(user._id)
  

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")


    const options = {
      httpOnly : true,
      secure : true
    }

    return res.status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
      new ApiResponse(200,
        {
         user : loggedInUser,accessToken,refreshToken 
        },
        "User loggedIn successfully"
        )
    )
 
})

const logoutUser = asyncHandler(async (req, res) =>{

  User.findByIdAndUpdate(
    req.user._id,
    {
      $set:{
        refreshToken :undefined
      }
      
    },
    {
     new :true
    }
  )
  const options = {
    httpOnly : true,
    secure : true
  }
return res.status(200)
.clearCookie("accessToken",options)
.clearCookie("refreshToken",options)
.json(new ApiResponse(200,{},"User logged out "))


})


export { registerUser ,loginUser,logoutUser}
