const express = require('express')
const app = express()
const port = 5000
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const config = require('./config/key');
const { auth } = require("./middleware/auth");
const { User } = require("./models/User");

// aplication/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: true}));
// application/json
app.use(bodyParser.json());
app.use(cookieParser());

const mongoose = require('mongoose')
mongoose.connect(config.mongoURI, {
    useNewUrlParser: true, useUnifiedTopology: true
}).then(()=> console.log('MongoDB Connected'))
    .catch(err => console.log(err))

app.get('/', (req, res) => res.send("d world!"))

app.post("/api/users/register", (req, res)=> {
    // 회원 가입 시 필요한 정보를 client에서 가져오면 DB에 넣음
    const user = new User(req.body)

    user.save((err, userInfo) => {
        if(err) return res.json({success: false, err})
        return res.status(200).json({
            success: true
        })
    })
})

app.post("/api/users/login", (req,res)=>{
	//요청된 이메일을 데이터 베이스에서 있는지 찾는다.
	User.findOne({email: req.body.email}, (err,user)=>{
		if(!user){
		return res.json({
			loginSuccess: false,
			message: "제공된 이메일에 해당하는 유저가 없습니다."
		})
	}
	user.comparePassword(req.body.password, (err,isMatch)=>{
		if(!isMatch)
			return res.json({ loginSuccess: false, message:"비밀번호가 틀렸습니다." })

		//비밀번호가 맞다면 토큰을 생성하기
		user.generateToken((err, user)=> {
			if(err) return res.status(400).send(err);

			//토큰을 쿠키에 저장한다
			res.cookie("x_auth",user.token)
			.status(200)
			.json({loginSuccess: true ,userId: user._id}) 
		})
		})
	})
})

app.get("/api/users/auth", auth, (req, res) => {
    // 미들웨어 통과했다는 것은 Authentication이  True
    res.status(200).json({
        _id: req.user._id,
        // role 0 : 일반유저 / 0이 아니면 관리자
        isAdmin: req.user.role === 0 ? false: true, 
        isAuth: true,
        email: req.user.email,
        name: req.user.name,
        lastname: req.user.lastname,
        role: req.user.role,
        image: req.user.image
    })
})

app.get('/api/users/logout', auth, (req, res) => {
    User.findOneAndUpdate({_id: req.user._id},
        { token: ""},
        (err, user) => {
            if(err) return res.json ({success: false, err});
            return res.status(200).send({
                sucess: true
            })
        })
})

app.listen(port, () => console.log(`Example app listening on port ${port}!`))