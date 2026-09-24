/* KOL Recommend System · 产品交互 Demo（Mock）
   1:1 复刻线上「小红书达人推荐 AI 工具」（LRB_RecommendTools）当前版本的界面与交互：
   三 Tab（AI 智能推荐 / 飞书达人库 / 导入达人库）+ 对话侧栏 + 流式达人卡片 +
   匹配度圆环 + 选择导出 CSV + 负面反馈换一批 + 达人库表格检索 + 设置弹窗。
   数据全部来自本文件的 16 位真实脱敏样例达人，不发起任何真实 API / LLM / 飞书请求。 */
import { track } from './analytics.js';

const mesc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const msleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ── 达人池：16 位真实小红书达人（昵称/主页/粉丝/报价/MCN 均来自真实导出库） ── */
const KOLS = [
  { name:"韩塔塔", accepts:"美妆护肤,个护产品,美容仪器", themes:"护肤教程,好物种草,年度盘点", a18:12.66, a25:53.79, a35:25.97, url:"https://www.xiaohongshu.com/user/profile/572181d084edcd648e9a8f2d", cat:"美妆个护", fullcat:"美妆个护", persona:"白领,精致女孩,护肤达人,温柔系,专业感", followers:306667, fdisp:"30.7万", likes:"1.6万", cmts:"1898", female:"91.03%", price:35000, vprice:37000, city:"广东 深圳 福田区", mcn:"三众文化", health:"优秀", active:"42.90%", batch:2, score:91, tags:["内容优质", "种草力强"], reason:"深肤美妆博主转向生活好物分享，粉丝与品牌目标人群重合，图文质感强" },
  { name:"元气小鸡血", accepts:"教育培训,医疗健康,服装鞋靴,运动户外,本地生活", themes:"职场生存法则,人脉社交技巧,中年成长记录", a18:36.21, a25:44.67, a35:4.97, url:"https://www.xiaohongshu.com/user/profile/59ee9f8b4eacab689bfe6993", cat:"职场/教育", fullcat:"职场/教育,情感/心理,生活方式", persona:"保险从业者,职场导师,中年女性,高能量,搞笑/沙雕,外放型", followers:274409, fdisp:"27.4万", likes:"1.3万", cmts:"1532", female:"92.67%", price:40000, vprice:50000, city:"广东 东莞", mcn:"蜂群", health:"优秀", active:"86.80%", batch:2, score:86, tags:["口碑好", "性价比高"], reason:"职场生活方式号，白领人群浓度高，适合「下班后的极简家务」叙事" },
  { name:"小老虎和哥哥（三胞胎天之文）", accepts:"运动户外,服装鞋靴,汽车,食品饮料", themes:"日常记录,兄弟互动,才艺展示", a18:20.44, a25:16.00, a35:18.89, url:"https://www.xiaohongshu.com/user/profile/5c7381cf000000001203fa81", cat:"生活方式", fullcat:"生活方式,兄弟账号,家庭账号", persona:"阳光少年,兄弟团,舞蹈达人,运动少年,养成系", followers:264067, fdisp:"26.4万", likes:"1.3万", cmts:"1617", female:"85.29%", price:32000, vprice:39000, city:"浙江 丽水 莲都区", mcn:"熊小婴", health:"优秀", active:"46.60%", batch:1, score:78, tags:["粉丝黏性好", "口碑好"], reason:"三胞胎家庭号话题度高，但洗护类接单较少，建议作为补充位测试家庭场景素材" },
  { name:"不凡的阿凡达", accepts:"职场教育, 科技数码, 医疗健康, 留学服务", themes:"职场成长, 留学攻略, 健康科普", a18:16.14, a25:40.40, a35:26.46, url:"https://www.xiaohongshu.com/user/profile/55db462be4b1cf486ade5218", cat:"生活方式", fullcat:"生活方式, 职场/教育, 知识科普", persona:"30岁女程序员, 农村女孩逆袭, 留学背景, 健康关注者", followers:209978, fdisp:"21万", likes:"9449", cmts:"1133", female:"83.88%", price:17000, vprice:22000, city:"美国", mcn:"五彩缤纷", health:"优秀", active:"73.30%", batch:2, score:79, tags:["转化率高", "粉丝黏性好"], reason:"旅居生活方式内容，人设清爽可信，适合品质感向的品牌素材" },
  { name:"涵哥很酷oO", accepts:"母婴用品,食品饮料,家居日用,旅游出行", themes:"日常记录,亲子育儿,夫妻相处", a18:24.50, a25:18.03, a35:11.66, url:"https://www.xiaohongshu.com/user/profile/5c29f59d0000000006028d38", cat:"生活方式", fullcat:"生活方式,母婴育儿,家庭账号", persona:"00 后,二胎妈妈,宝妈,夫妻档,精致感,温柔系", followers:221194, fdisp:"22.1万", likes:"8035", cmts:"964", female:"66.35%", price:14000, vprice:20000, city:"河南 商丘 睢阳区", mcn:"熊小婴", health:"优秀", active:"50.10%", batch:1, score:85, tags:["创意十足", "互动活跃"], reason:"家庭账号情景剧式内容，「爸爸带娃洗衣服」反差视角容易出爆款，适合差异化排期" },
  { name:"Rubee11", accepts:"美妆护肤,家居日用", themes:"护肤教程,好物种草,空瓶记,大促攻略", a18:6.41, a25:20.05, a35:34.66, url:"https://www.xiaohongshu.com/user/profile/5f41b9b6000000000100b868", cat:"美妆个护", fullcat:"美妆个护", persona:"精致感,成分党,护肤达人,白领,资深玩家", followers:202511, fdisp:"20.3万", likes:"1万", cmts:"1216", female:"91.93%", price:28000, vprice:30000, city:"湖北 武汉 江岸区", mcn:"米粟", health:"优秀", active:"39.20%", batch:2, score:89, tags:["风格独特", "互动活跃"], reason:"武汉本地精致女生内容，「独居洗衣也要有仪式感」角度契合产品留香卖点" },
  { name:"营养师辣妈Bella", accepts:"母婴用品,美妆护肤,食品饮料,医疗健康", themes:"亲子育儿,美妆教程,好物种草,日常记录", a18:41.63, a25:20.49, a35:5.66, url:"https://www.xiaohongshu.com/user/profile/5e9c09b00000000001008fb9", cat:"母婴育儿", fullcat:"母婴育儿,美妆个护,生活方式", persona:"宝妈,营养师,精致感,温柔系,理性克制", followers:273005, fdisp:"27.3万", likes:"1.5万", cmts:"1818", female:"66.82%", price:18000, vprice:23000, city:"江苏 无锡 锡山区", mcn:"熊小婴", health:"优秀", active:"10.00%", batch:1, score:94, tags:["口碑好", "粉丝黏性好"], reason:"成分党宝妈视角，能把浓缩配方、温和不伤手的卖点讲出专业感，测评类内容转化链路成熟" },
  { name:"达娜Dana", accepts:"家居日用,食品饮料,母婴用品,旅游出行", themes:"亲子育儿,日常记录,好物种草", a18:9.37, a25:28.75, a35:37.79, url:"https://www.xiaohongshu.com/user/profile/574a9b4bbd0da5148bc046f6", cat:"生活方式", fullcat:"生活方式,母婴育儿,旅行", persona:"宝妈,微胖逆袭,自驾达人,生活家,真实记录", followers:1056625, fdisp:"106万", likes:"4.6万", cmts:"5537", female:"84.54%", price:35000, vprice:105000, city:"云南 昆明 官渡区", mcn:"熊小婴", health:"优秀", active:"75.50%", batch:1, score:88, tags:["转化率高", "性价比高"], reason:"生活方式+亲子多品类内容，家庭日常渗透强，报价在预算内且互动稳定" },
  { name:"老板再加一碗饭", accepts:"3C 数码,汽车,运动户外,食品饮料,服装鞋靴,家居日用,教育培训", themes:"职场干货,日常记录,好物种草,健身打卡", a18:13.91, a25:47.40, a35:25.73, url:"https://www.xiaohongshu.com/user/profile/5faffc4b0000000001009301", cat:"职场/教育", fullcat:"职场/教育,生活方式", persona:"白领,高能量,精致感,33 岁,交易员,金融男,健身达人", followers:255060, fdisp:"25.5万", likes:"1万", cmts:"1232", female:"47.88%", price:34000, vprice:40000, city:"上海", mcn:"五彩缤纷", health:"优秀", active:"72.10%", batch:2, score:82, tags:["创意十足", "性价比高"], reason:"职场搞笑剧情号，洗衣房梗植入空间大，能带一波泛流量" },
  { name:"杨柳依", accepts:"母婴用品,家居日用,家电,食品饮料", themes:"亲子育儿,日常记录,好物种草", a18:10.17, a25:51.11, a35:28.45, url:"https://www.xiaohongshu.com/user/profile/58b5b1a25e87e753bff6a237", cat:"母婴育儿", fullcat:"母婴育儿,生活方式,家居家装", persona:"宝妈,精致感,温柔系", followers:1436710, fdisp:"144万", likes:"7.3万", cmts:"8773", female:"84.57%", price:50000, vprice:85000, city:"陕西 咸阳 秦都区", mcn:"懿世/曦禾互动", health:"优秀", active:"39.30%", batch:1, score:96, tags:["种草力强", "内容优质"], reason:"家居清洁+母婴双线内容，「家庭主妇真实日用」人设与汰渍原液「一瓶洗全家」卖点完全同频，25-34岁女粉占比高" },
  { name:"超模妈妈Yaya", accepts:"母婴用品,食品饮料,家居日用,旅游出行,汽车", themes:"亲子育儿,好物种草,海外出行,日常记录", a18:34.43, a25:37.36, a35:16.15, url:"https://www.xiaohongshu.com/user/profile/5b65beef69d6ce0001c5c3a8", cat:"母婴育儿", fullcat:"母婴育儿,生活方式", persona:"宝妈,精致感,育儿经验分享,产后恢复榜样", followers:224466, fdisp:"22.4万", likes:"7496", cmts:"899", female:"88.39%", price:22000, vprice:26000, city:"山东 淄博 张店区", mcn:"熊小婴", health:"优秀", active:"55.60%", batch:1, score:92, tags:["风格独特", "互动活跃"], reason:"精致宝妈人设，洗衣场景短视频质感好，适合打「阳台清爽一瓶搞定」的生活方式画面" },
  { name:"川的成分测评", url:"https://www.xiaohongshu.com/user/profile/5caace7400000000160178d0", cat:"美妆个护", fullcat:"美妆个护,知识科普", persona:"高级皮肤管理师,成分党,理性克制,专业感", followers:1245933, fdisp:"125万", likes:"4万", cmts:"4812", female:"92.10%", price:66000, vprice:66000, city:"湖南 长沙 开福区", mcn:"西子凡/门牙", health:"优秀", active:"30.10%", accepts:"美妆护肤,医疗健康,3C 数码", themes:"成分科普,产品测评,抗老护肤", a18:32.34, a25:17.61, a35:8.89, batch:1, score:89, tags:["种草力强", "专业度强"], reason:"高级皮肤管理师·成分党人设，成分科普、产品测评内容见长，长期承接美妆护肤、医疗健康类合作，18-24岁年轻粉占比突出" },
  { name:"复旦博士宇光", url:"https://www.xiaohongshu.com/user/profile/5a69cac74eacab1ba4083bbc", cat:"知识科普", fullcat:"知识科普, 美妆个护, 职场/教育, 生活方式", persona:"博士学历, 知性专业, 高能量, 理性克制, 白领, 戴眼镜", followers:502948, fdisp:"50.3万", likes:"2.1万", cmts:"2515", female:"81.50%", price:60000, vprice:79000, city:"江苏 苏州 苏州工业园区", mcn:"大禹", health:"优秀", active:"70.90%", accepts:"美妆护肤,医疗健康,教育培训,食品饮料,3C数码,家居日用", themes:"护肤科普,职场干货,健康养生,学习成长", a18:35.82, a25:28.27, a35:13.79, batch:1, score:89, tags:["粉丝黏性好", "专业度强"], reason:"博士学历·知性专业人设，护肤科普、职场干货内容见长，长期承接美妆护肤、医疗健康类合作，18-24岁年轻粉占比突出" },
  { name:"叫我瓜瓜", url:"https://www.xiaohongshu.com/user/profile/5dc016dd0000000001007545", cat:"健身运动", fullcat:"健身运动, 生活方式", persona:"健身达人, 体态教练, 养生博主, 白领, 精致感", followers:348969, fdisp:"34.9万", likes:"1.3万", cmts:"1607", female:"97.24%", price:9000, vprice:14800, city:"广东 惠州 惠阳区", mcn:"曦禾互动", health:"优秀", active:"80.80%", accepts:"运动户外,食品饮料,服装鞋靴", themes:"健身打卡,体态矫正,养生调理", a18:21.18, a25:40.00, a35:25.38, batch:1, score:94, tags:["粉丝黏性好", "种草力强"], reason:"健身达人·体态教练人设，健身打卡、体态矫正内容见长，长期承接运动户外、食品饮料类合作，25-34岁核心消费粉浓度高" },
  { name:"复旦博士Dr.Lim", url:"https://www.xiaohongshu.com/user/profile/6188c711000000001000c969", cat:"知识科普", fullcat:"知识科普,生活方式,美妆个护", persona:"医学博士,白领,知性,专业,亲切", followers:1962343, fdisp:"196万", likes:"10.4万", cmts:"1.2万", female:"83.39%", price:80000, vprice:80000, city:"江苏 南京 建邺区", mcn:"小灿灿", health:"优秀", active:"65.00%", accepts:"美妆护肤,医疗健康,食品饮料,家居日用,教育培训", themes:"医学科普,护肤教程,生活妙招,个人成长", a18:21.69, a25:30.52, a35:26.13, batch:1, score:89, tags:["粉丝黏性好", "专业度强"], reason:"医学博士·白领人设，医学科普、护肤教程内容见长，长期承接美妆护肤、医疗健康类合作，粉丝画像成熟稳定" },
  { name:"少女YUKI.", url:"https://www.xiaohongshu.com/user/profile/5ecb907d00000000010054ba", cat:"穿搭时尚", fullcat:"穿搭时尚,生活方式", persona:"颜值博主,拍照教程,身材管理,纯欲风,辣妹", followers:307478, fdisp:"30.7万", likes:"1.2万", cmts:"1442", female:"93.95%", price:10000, vprice:12000, city:"浙江 杭州 临平区", mcn:"三众文化", health:"优秀", active:"77.60%", accepts:"服装鞋靴,美妆护肤,本地生活", themes:"穿搭搭配,拍照技巧,身材管理", a18:55.72, a25:34.48, a35:2.58, batch:1, score:91, tags:["粉丝黏性好", "种草力强"], reason:"颜值博主·拍照教程人设，穿搭搭配、拍照技巧内容见长，长期承接服装鞋靴、美妆护肤类合作，18-24岁年轻粉占比突出" },
  { name:"是王哈哈-", url:"https://www.xiaohongshu.com/user/profile/5c497a26000000001203685f", cat:"美妆个护", fullcat:"穿搭时尚,生活方式", persona:"微胖女孩,穿搭博主,亲和力强,生活感,真实感", followers:179544, fdisp:"18万", likes:"9849", cmts:"1181", female:"98.75%", price:15000, vprice:15000, city:"山东 济南 历下区", mcn:"懿世/曦禾互动", health:"优秀", active:"90.90%", accepts:"服装鞋靴,美妆护肤,家居日用,旅游出行", themes:"穿搭搭配,日常记录,海外出行", a18:35.59, a25:58.62, a35:3.58, batch:1, score:94, tags:["粉丝黏性好", "种草力强"], reason:"微胖女孩·穿搭博主人设，穿搭搭配、日常记录内容见长，长期承接服装鞋靴、美妆护肤类合作，25-34岁核心消费粉浓度高" },
  { name:"萧枫", url:"https://www.xiaohongshu.com/user/profile/6121c65e0000000001014761", cat:"美妆个护", fullcat:"健身运动, 生活方式", persona:"宝妈, 家庭主妇, 健身达人, 冻龄女神, 自律, 高能量, 肌肉女", followers:223713, fdisp:"22.4万", likes:"1.1万", cmts:"1297", female:"84.17%", price:15000, vprice:15000, city:"北京", mcn:"懿世", health:"优秀", active:"90.80%", accepts:"运动户外,美妆护肤,食品饮料", themes:"健身打卡,抗衰/冻龄,女性成长", a18:14.43, a25:43.13, a35:30.37, batch:1, score:92, tags:["粉丝黏性好", "转化率高"], reason:"宝妈·家庭主妇人设，健身打卡、抗衰/冻龄内容见长，长期承接运动户外、美妆护肤类合作，25-34岁核心消费粉浓度高" },
  { name:"野生花艺师Fiona", url:"https://www.xiaohongshu.com/user/profile/5bb756c13c2ad90001331115", cat:"美妆个护", fullcat:"家居家装, 生活方式", persona:"手工达人, 精致感, 治愈系, 审美在线, 手持党", followers:344122, fdisp:"34.4万", likes:"1.6万", cmts:"1900", female:"94.91%", price:5200, vprice:6200, city:"广东 深圳 福田区", mcn:"懿世", health:"优秀", active:"90.80%", accepts:"家居日用,美妆护肤,食品饮料,家电", themes:"日常记录,好物种草,家居装饰", a18:14.72, a25:52.39, a35:23.09, batch:1, score:94, tags:["粉丝黏性好", "种草力强"], reason:"手工达人·精致感人设，日常记录、好物种草内容见长，长期承接家居日用、美妆护肤类合作，25-34岁核心消费粉浓度高" },
  { name:"小成不纠结", url:"https://www.xiaohongshu.com/user/profile/6464f3b6000000001f03183a", cat:"美妆个护", fullcat:"穿搭时尚", persona:"学生党,甜美系,小个子女生,元气少女", followers:191444, fdisp:"19.1万", likes:"8797", cmts:"1055", female:"98.48%", price:5000, vprice:12000, city:"广东 广州 增城区", mcn:"懿世", health:"优秀", active:"90.30%", accepts:"服装鞋靴,美妆护肤,家居日用", themes:"小个子穿搭,日常记录", a18:45.85, a25:47.61, a35:2.71, batch:1, score:94, tags:["粉丝黏性好", "种草力强"], reason:"学生党·甜美系人设，小个子穿搭、日常记录内容见长，长期承接服装鞋靴、美妆护肤类合作，25-34岁核心消费粉浓度高" },
  { name:"生椰捏铁Olive", url:"https://www.xiaohongshu.com/user/profile/5c6291470000000010003715", cat:"穿搭时尚", fullcat:"生活方式,职场/教育,旅行", persona:"留学生,打工妹,高能量,搞钱女孩,直率", followers:182108, fdisp:"18.2万", likes:"1万", cmts:"1214", female:"94.27%", price:20000, vprice:30000, city:"浙江 杭州 萧山区", mcn:"聚微", health:"优秀", active:"93.70%", accepts:"教育培训,旅游出行,服装鞋靴,食品饮料,3C 数码", themes:"北美打工,面试经验,英语口语,搞钱日记", a18:52.20, a25:27.16, a35:4.08, batch:1, score:91, tags:["粉丝黏性好", "种草力强"], reason:"留学生·打工妹人设，北美打工、面试经验内容见长，长期承接教育培训、旅游出行类合作，18-24岁年轻粉占比突出" },
  { name:"钱晟_Happy", url:"https://www.xiaohongshu.com/user/profile/59aea3e350c4b453064ffedb", cat:"穿搭时尚", fullcat:"健身运动", persona:"舞蹈教练, 健身陪练, 高能量, 开朗搞笑", followers:410704, fdisp:"41.1万", likes:"2.1万", cmts:"2514", female:"94.56%", price:15000, vprice:25000, city:"上海", mcn:"曦禾互动", health:"优秀", active:"92.00%", accepts:"运动户外,服装鞋靴,食品饮料,医疗健康", themes:"健身打卡,教程跟练", a18:6.07, a25:32.47, a35:44.79, batch:1, score:91, tags:["粉丝黏性好", "种草力强"], reason:"舞蹈教练·健身陪练人设，健身打卡、教程跟练内容见长，长期承接运动户外、服装鞋靴类合作，粉丝画像成熟稳定" },
  { name:"卷卷泡面头又饿了🍔", url:"https://www.xiaohongshu.com/user/profile/6679808a000000000700769a", cat:"美食探店", fullcat:"美食", persona:"美食博主, 家庭大厨, 深夜食堂", followers:503219, fdisp:"50.3万", likes:"1.7万", cmts:"2016", female:"75.12%", price:15000, vprice:35000, city:"湖南 长沙 雨花区", mcn:"曦禾互动", health:"优秀", active:"93.10%", accepts:"食品饮料,家居日用", themes:"美食教程,高热量满足", a18:26.42, a25:34.83, a35:20.18, batch:1, score:89, tags:["粉丝黏性好", "性价比高"], reason:"美食博主·家庭大厨人设，美食教程、高热量满足内容见长，长期承接食品饮料、家居日用类合作，粉丝画像成熟稳定" },
  { name:"夏秋秋要积极", url:"https://www.xiaohongshu.com/user/profile/5b3ac75fe8ac2b3a7aa9d51b", cat:"美食探店", fullcat:"美食", persona:"居家,热爱烹饪,治愈系,生活家", followers:155602, fdisp:"15.6万", likes:"6337", cmts:"760", female:"94.19%", price:5800, vprice:8800, city:"北京", mcn:"派芽星球", health:"优秀", active:"92.50%", accepts:"食品饮料,家居日用,家电", themes:"日常记录,美食教程", a18:6.75, a25:34.96, a35:40.18, batch:1, score:91, tags:["粉丝黏性好", "种草力强"], reason:"居家·热爱烹饪人设，日常记录、美食教程内容见长，长期承接食品饮料、家居日用类合作，粉丝画像成熟稳定" },
  { name:"KK轻食日记", url:"https://www.xiaohongshu.com/user/profile/57dbed0b5e87e7215897808d", cat:"美食探店", fullcat:"美食,生活方式", persona:"白领,打工人,减脂党,精致女孩,生活记录者", followers:508349, fdisp:"50.8万", likes:"2万", cmts:"2361", female:"96.65%", price:15000, vprice:17000, city:"浙江 宁波 海曙区", mcn:"派芽星球", health:"优秀", active:"91.00%", accepts:"食品饮料,家居日用", themes:"日常记录,好物种草,减脂餐", a18:24.33, a25:52.16, a35:16.94, batch:1, score:94, tags:["粉丝黏性好", "种草力强"], reason:"白领·打工人人设，日常记录、好物种草内容见长，长期承接食品饮料、家居日用类合作，25-34岁核心消费粉浓度高" },
  { name:"Sally的蒸菜日记", url:"https://www.xiaohongshu.com/user/profile/60140d8d000000000100af70", cat:"美食探店", fullcat:"美食", persona:"减脂博主,烹饪达人,生活记录者", followers:253342, fdisp:"25.3万", likes:"8230", cmts:"987", female:"88.53%", price:5000, vprice:11800, city:"广东 东莞", mcn:"", health:"优秀", active:"90.80%", accepts:"食品饮料,厨房家电,生鲜食材", themes:"低卡减脂,蒸菜教程,家常菜", a18:5.28, a25:30.06, a35:37.33, batch:1, score:91, tags:["粉丝黏性好", "种草力强"], reason:"减脂博主·烹饪达人人设，低卡减脂、蒸菜教程内容见长，长期承接食品饮料、厨房家电类合作，粉丝画像成熟稳定" },
  { name:"大柱小花家", url:"https://www.xiaohongshu.com/user/profile/62480b93000000001000a526", cat:"旅行出行", fullcat:"生活方式,家居家装,家庭账号", persona:"宝妈,精致感,生活感,治愈系", followers:848572, fdisp:"84.9万", likes:"3万", cmts:"3605", female:"88.64%", price:65000, vprice:108000, city:"广东 惠州 博罗县", mcn:"曦禾互动", health:"优秀", active:"93.70%", accepts:"家居日用,母婴用品,食品饮料,旅游出行,家电", themes:"日常记录,亲子育儿", a18:19.23, a25:38.49, a35:26.92, batch:1, score:94, tags:["粉丝黏性好", "种草力强"], reason:"宝妈·精致感人设，日常记录、亲子育儿内容见长，长期承接家居日用、母婴用品类合作，25-34岁核心消费粉浓度高" },
  { name:"庞颖", url:"https://www.xiaohongshu.com/user/profile/62944e23000000002102ab04", cat:"旅行出行", fullcat:"生活方式,知识科普", persona:"留学背景,白领,自由职业,知性,理性克制", followers:399510, fdisp:"40万", likes:"2.2万", cmts:"2582", female:"93.76%", price:100000, vprice:150000, city:"新加坡", mcn:"懿世", health:"优秀", active:"92.40%", accepts:"教育培训,旅游出行,食品饮料,3C 数码", themes:"海外出行,日常记录,职场干货", a18:36.14, a25:39.75, a35:14.39, batch:1, score:94, tags:["粉丝黏性好", "种草力强"], reason:"留学背景·白领人设，海外出行、日常记录内容见长，长期承接教育培训、旅游出行类合作，25-34岁核心消费粉浓度高" },
  { name:"中国气象爱好者", url:"https://www.xiaohongshu.com/user/profile/555a8d9f538c2544e1119274", cat:"健身运动", fullcat:"知识科普", persona:"高校教师,理性克制,专业", followers:558319, fdisp:"55.8万", likes:"2.8万", cmts:"3392", female:"69.70%", price:29200, vprice:31900, city:"江苏 常州 新北区", mcn:"五彩缤纷", health:"优秀", active:"90.00%", accepts:"运动户外,家居日用,汽车", themes:"气象科普,日常记录", a18:17.36, a25:45.73, a35:25.12, batch:1, score:92, tags:["粉丝黏性好", "转化率高"], reason:"高校教师·理性克制人设，气象科普、日常记录内容见长，长期承接运动户外、家居日用类合作，25-34岁核心消费粉浓度高" },
  { name:"池恩不沉_", url:"https://www.xiaohongshu.com/user/profile/615d7f80000000000201b6a5", cat:"健身运动", fullcat:"健身运动,生活方式", persona:"运动达人,精致感,高能量,阳光活力", followers:212765, fdisp:"21.3万", likes:"8548", cmts:"1025", female:"89.66%", price:30000, vprice:54000, city:"陕西 西安 雁塔区", mcn:"懿世", health:"优秀", active:"89.90%", accepts:"运动户外,美妆护肤,服装鞋靴,食品饮料,家居日用", themes:"运动健身,日常记录", a18:27.22, a25:54.59, a35:10.91, batch:1, score:94, tags:["粉丝黏性好", "种草力强"], reason:"运动达人·精致感人设，运动健身、日常记录内容见长，长期承接运动户外、美妆护肤类合作，25-34岁核心消费粉浓度高" },
  { name:"双语妈妈撸姐", url:"https://www.xiaohongshu.com/user/profile/58fee36650c4b44f0cf0da4c", cat:"母婴育儿", fullcat:"母婴育儿,知识科普", persona:"宝妈,戴眼镜,高能量,亲切感", followers:219309, fdisp:"21.9万", likes:"7798", cmts:"935", female:"89.27%", price:18000, vprice:25000, city:"四川 成都 双流区", mcn:"熊小婴", health:"优秀", active:"91.10%", accepts:"母婴用品,教育培训,图书/绘本", themes:"亲子英语,日常口语", a18:7.29, a25:41.87, a35:40.62, batch:1, score:94, tags:["粉丝黏性好", "种草力强"], reason:"宝妈·戴眼镜人设，亲子英语、日常口语内容见长，长期承接母婴用品、教育培训类合作，25-34岁核心消费粉浓度高" },
  { name:"西柚与婷婷", url:"https://www.xiaohongshu.com/user/profile/6098fc8c0000000001006100", cat:"母婴育儿", fullcat:"生活方式,家居家装", persona:"宝妈,生活达人,DIY 能手,性价比追求者", followers:780747, fdisp:"78.1万", likes:"3.9万", cmts:"4739", female:"84.00%", price:30000, vprice:48800, city:"安徽 马鞍山 花山区", mcn:"聚微", health:"优秀", active:"90.10%", accepts:"家居日用,家电,母婴用品,食品饮料", themes:"日常记录,好物种草,装修避雷", a18:23.27, a25:38.00, a35:21.11, batch:1, score:92, tags:["粉丝黏性好"], reason:"宝妈·生活达人人设，日常记录、好物种草内容见长，长期承接家居日用、家电类合作，25-34岁核心消费粉浓度高" },
  { name:"Lookocherry.大徐", url:"https://www.xiaohongshu.com/user/profile/5b36411d11be106ed3696250", cat:"母婴育儿", fullcat:"生活方式,美食", persona:"宝妈,美食爱好者,生活家,精致妈妈,广东/港澳生活", followers:286828, fdisp:"28.7万", likes:"1.4万", cmts:"1695", female:"89.12%", price:28000, vprice:40000, city:"广东 广州 海珠区", mcn:"曦禾互动", health:"优秀", active:"89.90%", accepts:"食品饮料,母婴用品,家居日用,美妆护肤,厨房家电", themes:"家庭料理,美食种草,节日仪式感,亲子生活", a18:14.11, a25:47.23, a35:26.28, batch:1, score:94, tags:["粉丝黏性好", "种草力强"], reason:"宝妈·美食爱好者人设，家庭料理、美食种草内容见长，长期承接食品饮料、母婴用品类合作，25-34岁核心消费粉浓度高" },
  { name:"李尔王的生活", url:"https://www.xiaohongshu.com/user/profile/5be2ad66c548e1000124cf47", cat:"数码科技", fullcat:"家居家装, 生活方式", persona:"DIY 达人, 动手能力强者, 性价比追求者, 猫主人", followers:177075, fdisp:"17.7万", likes:"6549", cmts:"785", female:"64.80%", price:9000, vprice:26000, city:"广东 惠州 惠阳区", mcn:"曦禾互动", health:"优秀", active:"91.60%", accepts:"家居日用,家电,宠物用品,3C数码", themes:"家居改造,DIY 教程", a18:8.29, a25:38.21, a35:34.22, batch:1, score:92, tags:["粉丝黏性好", "性价比高"], reason:"DIY 达人·动手能力强者人设，家居改造、DIY 教程内容见长，长期承接家居日用、家电类合作，25-34岁核心消费粉浓度高" },
  { name:"白马教开车", url:"https://www.xiaohongshu.com/user/profile/645921b80000000029015db5", cat:"数码科技", fullcat:"汽车", persona:"驾校教练,专业可靠,实用导师", followers:601457, fdisp:"60.1万", likes:"3.3万", cmts:"4002", female:"83.46%", price:34642, vprice:60000, city:"四川 成都 双流区", mcn:"懿世", health:"优秀", active:"90.60%", accepts:"汽车,3C数码,本地生活", themes:"驾驶教学,新手上路指导", a18:17.59, a25:61.45, a35:15.55, batch:1, score:92, tags:["粉丝黏性好", "转化率高"], reason:"驾校教练·专业可靠人设，驾驶教学、新手上路指导内容见长，长期承接汽车、3C数码类合作，25-34岁核心消费粉浓度高" },
  { name:"木木花下班后～", url:"https://www.xiaohongshu.com/user/profile/5dfd9469000000000100331f", cat:"宠物萌宠", fullcat:"生活方式", persona:"白领,独居,治愈系,松弛感,生活感", followers:234153, fdisp:"23.4万", likes:"7341", cmts:"880", female:"91.70%", price:7000, vprice:12000, city:"福建 福州 长乐区", mcn:"三众文化", health:"优秀", active:"86.20%", accepts:"家居日用,食品饮料,小家电,宠物用品,个护清洁", themes:"日常记录,好物种草", a18:25.23, a25:62.24, a35:7.42, batch:1, score:94, tags:["粉丝黏性好", "种草力强"], reason:"白领·独居人设，日常记录、好物种草内容见长，长期承接家居日用、食品饮料类合作，25-34岁核心消费粉浓度高" },
  { name:"小咪的爸爸", url:"https://www.xiaohongshu.com/user/profile/5b4c4d664eacab753b64984b", cat:"宠物萌宠", fullcat:"宠物,生活方式", persona:"中年男性,猫爸,爱宠人士,温暖治愈,亲和力强", followers:208562, fdisp:"20.9万", likes:"1.1万", cmts:"1349", female:"90.28%", price:7000, vprice:9500, city:"浙江 杭州 钱塘区", mcn:"懿世/飞博", health:"优秀", active:"85.60%", accepts:"宠物用品,食品饮料,家居日用,汽车", themes:"养猫日常,宠物互动,生活记录", a18:39.93, a25:28.99, a35:7.61, batch:1, score:91, tags:["粉丝黏性好", "种草力强"], reason:"中年男性·猫爸人设，养猫日常、宠物互动内容见长，长期承接宠物用品、食品饮料类合作，18-24岁年轻粉占比突出" },
  { name:"野人", url:"https://www.xiaohongshu.com/user/profile/6108e81f000000000101f798", cat:"宠物萌宠", fullcat:"宠物, 旅行", persona:"自由职业, 户外玩家, 松弛感", followers:357723, fdisp:"35.8万", likes:"1.5万", cmts:"1755", female:"76.29%", price:26000, vprice:50000, city:"四川 成都 双流区", mcn:"聚微", health:"优秀", active:"83.90%", accepts:"宠物用品,运动户外,旅游出行,家居日用", themes:"人宠陪伴,户外徒步露营", a18:36.18, a25:22.73, a35:10.51, batch:1, score:89, tags:["粉丝黏性好"], reason:"自由职业·户外玩家人设，人宠陪伴、户外徒步露营内容见长，长期承接宠物用品、运动户外类合作，18-24岁年轻粉占比突出" },
  { name:"Tammy外贸笔记", url:"https://www.xiaohongshu.com/user/profile/5acd74d311be1075d7f126c6", cat:"职场成长", fullcat:"职场/教育,生活方式", persona:"白领,精致感,理性克制,职场导师", followers:194018, fdisp:"19.4万", likes:"6816", cmts:"817", female:"91.90%", price:28000, vprice:30000, city:"广东 佛山 南海区", mcn:"懿世", health:"优秀", active:"88.90%", accepts:"教育培训,3C 数码,服装鞋靴,旅游出行", themes:"职场干货,日常记录,海外出行", a18:31.91, a25:49.49, a35:14.00, batch:1, score:94, tags:["粉丝黏性好", "种草力强"], reason:"白领·精致感人设，职场干货、日常记录内容见长，长期承接教育培训、3C 数码类合作，25-34岁核心消费粉浓度高" },
  { name:"外企人的英语备忘录", url:"https://www.xiaohongshu.com/user/profile/5deb55db0000000001000e0b", cat:"职场成长", fullcat:"知识科普,职场/教育", persona:"职场导师,英语博主,理性克制", followers:191014, fdisp:"19.1万", likes:"1万", cmts:"1254", female:"86.55%", price:8000, vprice:16906, city:"上海", mcn:"懿世", health:"优秀", active:"88.90%", accepts:"教育培训,3C 数码,图书", themes:"职场干货,英语纠错", a18:16.17, a25:58.57, a35:18.94, batch:1, score:94, tags:["粉丝黏性好", "种草力强"], reason:"职场导师·英语博主人设，职场干货、英语纠错内容见长，长期承接教育培训、3C 数码类合作，25-34岁核心消费粉浓度高" },
  { name:"行者", url:"https://www.xiaohongshu.com/user/profile/59c126f351783a3b0b4ff5b9", cat:"职场成长", fullcat:"知识科普,职场/教育", persona:"创业者,自由职业,清醒独立,成长导师", followers:628825, fdisp:"62.9万", likes:"2.1万", cmts:"2566", female:"84.82%", price:32000, vprice:46000, city:"广东 深圳 龙岗区", mcn:"曦禾互动", health:"优秀", active:"87.40%", accepts:"教育培训,3C 数码,家居日用", themes:"个人成长,职场干货", a18:20.38, a25:44.72, a35:24.20, batch:1, score:92, tags:["粉丝黏性好", "转化率高"], reason:"创业者·自由职业人设，个人成长、职场干货内容见长，长期承接教育培训、3C 数码类合作，25-34岁核心消费粉浓度高" },
  { name:"一杯菜菜", url:"https://www.xiaohongshu.com/user/profile/5710af491c07df435cd7cc8d", cat:"婚礼婚嫁", fullcat:"情侣账号", persona:"颜值博主,戏精/搞笑,备婚博主,精致感,宠溺互动", followers:169378, fdisp:"16.9万", likes:"7200", cmts:"864", female:"87.10%", price:5500, vprice:9500, city:"福建 厦门 湖里区", mcn:"曦禾互动", health:"优秀", active:"57.70%", accepts:"美妆护肤,服装鞋靴,家居日用,本地生活,婚庆服务", themes:"情侣日常,备婚婚礼,节日庆祝,好物分享", a18:36.47, a25:28.98, a35:7.39, batch:1, score:91, tags:["粉丝黏性好", "种草力强"], reason:"颜值博主·戏精/搞笑人设，情侣日常、备婚婚礼内容见长，长期承接美妆护肤、服装鞋靴类合作，18-24岁年轻粉占比突出" },
];

const TAG_COLORS = {
  '种草力强': 'rose', '转化率高': 'orange', '粉丝黏性好': 'amber', '内容优质': 'emerald',
  '性价比高': 'teal', '专业度强': 'sky', '风格独特': 'violet', '互动活跃': 'pink',
  '口碑好': 'lime', '创意十足': 'indigo',
};

/* 头像：内联 SVG data-URI，首字 + 稳定色底，无网络依赖 */
const AV_COLORS = ['#FF2442', '#FF6B6B', '#E85D75', '#D94F70', '#C2554F', '#B0577D', '#8A6BC2', '#5B8C5A'];
function avatar(name) {
  let h = 0; for (const c of String(name)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const bg = AV_COLORS[h % AV_COLORS.length];
  const ch = [...String(name).trim()][0] || '?';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="112" height="112"><rect width="112" height="112" rx="56" fill="${bg}"/><text x="56" y="56" dy="0.36em" text-anchor="middle" font-family="system-ui,sans-serif" font-size="46" font-weight="600" fill="#fff">${ch.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text></svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}
const yuan = (v) => (v >= 10000 ? '¥' + (v / 10000).toFixed(1).replace(/\.0$/, '') + 'w' : '¥' + v);
const ringColor = (s) => (s >= 90 ? '#FF2442' : s >= 75 ? '#FF6B6B' : s >= 60 ? '#FFA940' : '#69C0FF');

/* 预设需求（延续内容 QC demo 的汰渍原液故事线） */
const PRESET_BRIEF = '我们汰渍原液新品要在小红书种草，想找家居生活类的达人，面向25-34岁宝妈和白领女性，预算5-10万';
const CAT_HINT_WORDS = ['美妆', '护肤', '彩妆', '家清', '家居', '洗衣', '清洁', '母婴', '育儿', '宝宝', '美食', '零食', '饮料', '数码', '科技', '穿搭', '时尚', '旅行', '酒店', '健身', '运动', '宠物', '教育', '婚礼'];
const NEG_WORDS = ['不合适', '不要', '不喜欢', '换一批', '其他的', '再找', '不满意'];

export function mountMatchProduct(host) {
  const source = host.dataset.source || 'deck';
  const S = {
    tab: 'recommend', sidebarCollapsed: false,
    sessions: [], cur: 'cur',
    sending: false, streaming: false, selected: new Set(), imported: false,
    libQuery: '', libCat: 'all', libPage: 0, libOpen: null, modal: null,
    settings: { model: 'Agnes-2.0-flash', llmUrl: 'https://api.example-llm.com/v1', apiKey: 'sk-••••••••••3f9d', feishuApp: 'cli_a1b2****', feishuSecret: '••••••••', feishuTable: 'tbl_9x8y****' },
  };

  const TIDE6 = KOLS.filter((k) => ['杨柳依', '营养师辣妈Bella', '超模妈妈Yaya', '达娜Dana', '涵哥很酷oO', '小老虎和哥哥（三胞胎天之文）'].includes(k.name));
  const freshCtx = () => ({ category: '', scene: '', audience: '', budget: '', tier: '', recNames: [], excluded: [] });
  S.sessions = [
    { id: 'hist1', title: '汰渍达人筛选', ts: Date.now() - 12 * 60000, count: 6,
      ctx: { category: '家居生活', scene: '清洁洗护', audience: '宝妈群体', budget: '5-10万', tier: '', recNames: TIDE6.map((k) => k.name), excluded: [] },
      msgs: [
        { id: 'h1', role: 'user', content: '汰渍原液新品上市，主打一瓶洗全家，想找家居清洁方向的达人，预算5-10万' },
        { id: 'h2', role: 'assistant', content: '我识别到你的需求：家居生活 · 清洁洗护 方向，预算5-10万。' },
        { id: 'h3', role: 'assistant', type: 'thinking', content: '明白了！我来帮你找家居生活 · 清洁洗护领域的达人，面向宝妈群体，预算5-10万。正在筛选中...' },
        { id: 'h4', role: 'assistant', type: 'result',
          content: '根据你的需求（家居生活 · 清洁洗护 · 宝妈群体 · 预算5-10万），我从达人库中为你匹配了 6 位达人，综合匹配度 89%。已按接单品类、内容主题、粉丝年龄段占比与图文报价逐项过滤。建议优先联系前两位锁档，其余可作为组合排期补充。',
          data: { influencers: TIDE6 } },
        { id: 'h5', role: 'user', content: '前两位先锁档，其余进候选池待排期' },
        { id: 'h6', role: 'assistant', content: '收到，已同步到候选池。真实系统里会同时把档期与报价字段回写到飞书多维表格。' },
      ] },
    { id: 'cur', title: '新对话', ts: Date.now(), count: 0, ctx: freshCtx(), msgs: [] },
  ];
  const act = () => S.sessions.find((x) => x.id === S.cur) || S.sessions[1];

  host.innerHTML = '<div class="rcapp"><div class="rc-page"></div></div>';
  const app = host.querySelector('.rcapp');
  const page = app.querySelector('.rc-page');
  const toasts = document.createElement('div'); toasts.className = 'rc-toasts'; app.appendChild(toasts);
  function toast(msg) {
    const el = document.createElement('div'); el.className = 'rc-toast'; el.setAttribute('role', 'status');
    el.innerHTML = `<b>🧪 模拟环境</b>${mesc(msg)}`;
    toasts.appendChild(el);
    setTimeout(() => { el.classList.add('is-out'); setTimeout(() => el.remove(), 350); }, 2800);
  }

  /* ============================================================ 骨架渲染 */
  function render() {
    page.innerHTML = headerHTML() + `<main class="rc-main">` + tabsBarHTML() + tabContent() + `</main>` + footerHTML();
    let mz = app.querySelector('[data-modalzone]');
    if (!mz) { mz = document.createElement('div'); mz.setAttribute('data-modalzone', '1'); app.appendChild(mz); }
    mz.innerHTML = S.modal ? modalHTML() : '';
    app.querySelectorAll('.rc-ring-arc').forEach((a) => a.setAttribute('stroke-dashoffset', a.dataset.off));
    if (S.tab === 'recommend') scrollChatBottom(true);
  }

  const headerHTML = () => `<header class="rc-header"><div class="rc-header-in">
    <div class="rc-brand"><span class="rc-logo" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9.66 17h4.68M12 3v1m6.36 1.64l-.7.7M21 12h-1M4 12H3m3.34-5.66l-.7-.7m2.82 9.9a5 5 0 117.08 0l-.55.55A3.37 3.37 0 0014 18.47V19a2 2 0 11-4 0v-.53c0-.9-.36-1.76-.99-2.39l-.55-.54z" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
      <div><h1>小红书达人推荐</h1><p>AI 智能匹配 · 精准推荐</p></div></div>
    <div class="rc-header-right"><span class="rc-badge-ai">AI Powered</span>
      <button class="rc-gear" data-act="settings" aria-label="设置"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33 1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82 1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
    </div></div></header>`;

  const tabsBarHTML = () => `<div class="rc-tabs" role="tablist">
    ${[['recommend', 'AI 智能推荐'], ['library', '飞书达人库'], ['import', '导入达人库']].map(([v, t]) =>
      `<button role="tab" aria-selected="${S.tab === v}" class="rc-tab${S.tab === v ? ' is-active' : ''}" data-tab="${v}">${t}</button>`).join('')}
  </div>`;

  const footerHTML = () => `<footer class="rc-footer">Demo 为纯前端模拟环境：对话、推荐与达人数据均为预置样例，不会发起真实 API / LLM / 飞书调用。</footer>`;

  function tabContent() {
    if (S.tab === 'recommend') return chatPane();
    if (S.tab === 'library') return libraryPane();
    return importPane();
  }

  /* ============================================================ Tab1 对话 */
  const fmtTime = (ts) => {
    const m = Math.floor((Date.now() - ts) / 60000);
    if (m < 1) return '刚刚'; if (m < 60) return m + '分钟前';
    const h = Math.floor(m / 60); if (h < 24) return h + '小时前';
    return Math.floor(h / 24) + '天前';
  };

  function chatPane() {
    return `<div class="rc-chatwrap">
      <aside class="rc-side${S.sidebarCollapsed ? ' is-collapsed' : ''}">
        <div class="rc-side-head">${S.sidebarCollapsed ? '' : '<span>对话历史</span>'}
          <button class="rc-side-fold" data-act="fold" aria-label="折叠侧栏">${S.sidebarCollapsed ? '&#187;' : '&#171;'}</button></div>
        <div class="rc-side-new"><button class="rc-btn-new" data-act="newchat">${S.sidebarCollapsed ? '+' : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14" stroke-linecap="round"/></svg><span>新建对话</span>'}</button></div>
        <div class="rc-side-list">${S.sessions.map((x) =>
          `<div class="rc-side-item${x.id === S.cur ? ' is-active' : ''}" data-sel="${x.id}">
            ${S.sidebarCollapsed ? '<span class="rc-side-ico">💬</span>' : `<p class="rc-side-title">${mesc(x.title)}</p>
            <div class="rc-side-meta"><span>${fmtTime(x.ts)}</span>${x.count ? `<i>&middot;</i><span>${x.count}位达人</span>` : ''}</div>`}
          </div>`).join('')}</div>
      </aside>
      <section class="rc-chat">
        <div class="rc-chat-scroll" data-chat>
          ${act().msgs.length ? act().msgs.map(messageHTML).join('') : emptyChatHTML()}
          ${S.streaming ? '<div class="rc-msg rc-msg--ai is-thinking"><i class="rc-spin"></i>正在筛选达人...</div>' : ''}
        </div>
        <div class="rc-chat-input">
          <textarea data-input rows="2" placeholder="描述你想找什么样的达人..." ${S.sending ? 'disabled' : ''}></textarea>
          <button class="rc-send" data-act="send" aria-label="发送" ${S.sending ? 'disabled' : ''}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        </div>
      </section>
    </div>`;
  }

  const emptyChatHTML = () => `<div class="rc-chat-empty">
      <p class="rc-chat-empty-hi">你好！我是达人推荐助手</p>
      <p>告诉我你想找什么样的达人，比如：</p>
      <ul><li>"帮我找几个美妆博主推广护肤品"</li><li>"需要母婴类达人，预算5万以内"</li><li>"找年轻粉丝多的穿搭博主"</li></ul>
      <button class="rc-preset-btn" data-act="preset">📥 一键填入预置需求（汰渍原液种草）</button>
    </div>`;

  function messageHTML(m) {
    if (m.role === 'user') return `<div class="rc-msg rc-msg--user"><div>${mesc(m.content)}</div></div>`;
    if (m.type === 'thinking') return `<div class="rc-msg rc-msg--ai is-thinking"><i class="rc-spin"></i>${mesc(m.content)}</div>`;
    if (m.type === 'result') return resultBlockHTML(m);
    if (m.type === 'guide') return guideHTML(m);
    return `<div class="rc-msg rc-msg--ai"><div>${mesc(m.content)}</div></div>`;
  }

  function resultBlockHTML(m) {
    const list = m.data.influencers;
    const allSel = list.length && list.every((k) => S.selected.has(k.name));
    return `<div class="rc-result" data-mid="${m.id}">
      <div class="rc-summary"><p>${mesc(m.content)}</p></div>
      <div class="rc-toolbar">
        <div class="rc-toolbar-left">
          <button class="rc-selall" data-act="selall" data-mid="${m.id}">
            <span class="rc-check${allSel ? ' is-on' : ''}">${allSel ? '✓' : ''}</span>全选</button>
          <span class="rc-count">已选 <b data-selcount>${S.selected.size}</b>/<b data-total>${list.length}</b></span>
        </div>
        <button class="rc-btn-export" data-act="export" ${S.selected.size ? '' : 'disabled'}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke-linecap="round" stroke-linejoin="round"/></svg>
          导出深度数据 (<span data-selcount>${S.selected.size}</span>)</button>
      </div>
      <div class="rc-grid" data-grid="${m.id}">${list.map((k, i) => cardHTML(k, i)).join('')}</div>
      <p class="rc-hint">如果不满意这些推荐，可以说"不合适"或"换一批"，AI会自动排除并重新推荐</p>
    </div>`;
  }

  function cardHTML(k, i) {
    const sel = S.selected.has(k.name);
    const rc = ringColor(k.score);
    const C = 2 * Math.PI * 28, off = C - (k.score / 100) * C;
    return `<div class="rc-card rc-card--in" style="animation-delay:${Math.min(i, 8) * 90}ms" data-card="${mesc(k.name)}">
      <div class="rc-card-top">
        <label class="rc-card-check"><input type="checkbox" data-pick="${mesc(k.name)}" ${sel ? 'checked' : ''}/></label>
        <div class="rc-card-avatar"><img src="${avatar(k.name)}" alt="${mesc(k.name)}"/><span class="rc-card-cat">${mesc(k.cat)}</span></div>
        <div class="rc-card-id">
          <div class="rc-card-idrow"><h3><a href="${mesc(k.url)}" target="_blank" rel="noopener noreferrer" title="打开达人主页">${mesc(k.name)}</a></h3>
            <svg class="rc-ring" width="64" height="64" viewBox="0 0 64 64" role="img" aria-label="匹配度 ${k.score}">
              <circle cx="32" cy="32" r="28" stroke="#E5E5E5" stroke-width="4" fill="none"/>
              <circle class="rc-ring-arc" cx="32" cy="32" r="28" stroke="${rc}" stroke-width="4" fill="none" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${C.toFixed(1)}" data-off="${off.toFixed(1)}" stroke-linecap="round" transform="rotate(-90 32 32)"/>
              <text x="32" y="32" dy="0.35em" text-anchor="middle" font-size="15" font-weight="700" fill="${rc}" font-family="'DM Sans',system-ui,sans-serif">${k.score}</text>
            </svg></div>
          <p class="rc-card-style">${mesc(k.persona.split(',').slice(0, 3).join(' · '))}</p>
        </div>
      </div>
      <div class="rc-card-stats">
        <span><svg class="rc-ico-red" viewBox="0 0 20 20" fill="currentColor"><path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"/></svg><b>${mesc(k.fdisp)}</b></span>
        <span><svg class="rc-ico-red" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3.17 5.17a4 4 0 015.66 0L10 6.34l1.17-1.17a4 4 0 115.66 5.66L10 17.66l-6.83-6.83a4 4 0 010-5.66z" clip-rule="evenodd"/></svg><i>${mesc(k.likes)}</i></span>
        <span><svg class="rc-ico-gray" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 13V5a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2h3l3 3 3-3h3a2 2 0 002-2zM5 7a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm1 3a1 1 0 100 2h3a1 1 0 100-2H6z" clip-rule="evenodd"/></svg><i>${mesc(k.cmts)}</i></span>
      </div>
      <div class="rc-card-reason"><b>AI 推荐：</b>${mesc(k.reason)}${k.a25 ? `<span class="rc-card-fit">25-34岁粉 ${k.a25.toFixed(0)}% · 女粉 ${mesc(k.female)}</span>` : ''}</div>
      <div class="rc-card-foot">
        <div class="rc-tags">${k.tags.map((t) => `<span class="rc-tag rc-tag--${TAG_COLORS[t] || 'gray'}">${mesc(t)}</span>`).join('')}</div>
        <span class="rc-price">${yuan(k.price)}/图文</span>
      </div>
    </div>`;
  }

  /* ── 增量消息（吸取 QC demo 教训：流式只 append，不整页 render） ── */
  let midSeq = 0;
  const newMid = () => 'm' + (++midSeq);
  function chatScrollEl() { return app.querySelector('[data-chat]'); }
  function scrollChatBottom() {
    const el = chatScrollEl(); if (!el) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollTo({ top: el.scrollHeight, behavior: reduced ? 'auto' : 'smooth' });
  }
  function appendMsg(html) {
    const el = chatScrollEl(); if (!el) return null;
    const empty = el.querySelector('.rc-chat-empty'); if (empty) empty.remove();
    const wrap = document.createElement('div'); wrap.innerHTML = html;
    const node = wrap.firstElementChild;
    const tip = el.querySelector('[data-streamtip]');
    if (tip) tip.before(node); else el.appendChild(node);
    scrollChatBottom();
    return node;
  }

  function aiSay(content, type) {
    const m = { id: newMid(), role: 'assistant', content, type: type || 'text' };
    act().msgs.push(m);
    appendMsg(messageHTML(m));
    return m;
  }
  function userSay(content) {
    const m = { id: newMid(), role: 'user', content };
    act().msgs.push(m);
    appendMsg(messageHTML(m));
    return m;
  }

  /* ── 需求引导（不接大模型：关键词命中→缺字段点选确认；未命中→大类→细分场景→人群→预算/量级） ── */
  const WIZ = {
    cats: ['美妆个护', '穿搭时尚', '美食探店', '旅行出行', '健身运动', '母婴育儿', '数码科技', '家居生活', '教育学习', '宠物萌宠', '职场成长', '婚礼婚嫁'],
    scenes: {
      '美妆个护': ['护肤保养', '彩妆种草', '个护洗护', '香水香氛'],
      '穿搭时尚': ['通勤穿搭', '约会穿搭', '运动休闲', '配饰鞋包'],
      '美食探店': ['零食测评', '餐厅探店', '饮品甜品', '下厨料理'],
      '旅行出行': ['酒店民宿', '景点攻略', '出行装备', '亲子旅行'],
      '健身运动': ['减脂塑形', '瑜伽普拉提', '运动装备', '健康饮食'],
      '母婴育儿': ['奶粉辅食', '玩具用品', '早教启蒙', '孕产护理'],
      '数码科技': ['手机电脑', '智能穿戴', '影音设备', '效率工具'],
      '家居生活': ['清洁洗护', '收纳整理', '家纺床品', '家装好物'],
      '教育学习': ['语言学习', '考证升学', '知识付费', '学习方法'],
      '宠物萌宠': ['猫犬用品', '宠物食品', '萌宠日常', '医疗护理'],
      '职场成长': ['效率工具', '职场穿搭', '副业成长', '办公好物'],
      '婚礼婚嫁': ['婚纱礼服', '婚礼策划', '婚戒珠宝', '蜜月旅行'],
    },
    audiences: ['18-24岁女性', '25-34岁女性', '35-44岁女性', '学生群体', '白领群体', '宝妈群体', '全年龄段'],
    budgets: ['1万以内', '1-5万', '5-10万', '10-50万', '50万以上', '不限预算'],
    tiers: ['不限', '头部 50w+', '腰部 10-50w', '尾部 10w 以下'],
  };
  /* 真实字段过滤规则：大类→账号类型+接单品类；细分场景→接单品类+内容主题+人设；
     人群→粉丝年龄段占比/女粉占比/内容主题；预算→图文报价上限。全部来自真实导出库字段。 */
  const CAT_RE = {
    '美妆个护': /美妆|个护|护肤|彩妆/, '穿搭时尚': /穿搭|时尚|服装|服饰/, '美食探店': /美食|餐饮|食品|探店|本地生活/,
    '旅行出行': /旅行|旅游|出行|酒店/, '健身运动': /健身|运动/, '母婴育儿': /母婴|育儿|亲子/,
    '数码科技': /数码|3C|智能|电子/, '家居生活': /家居|家清|家装|收纳|家纺|日用/, '教育学习': /教育|学习|培训|知识/,
    '宠物萌宠': /宠物|萌宠/, '职场成长': /职场|教育|办公|培训/, '婚礼婚嫁': /婚礼|婚嫁|婚庆/,
  };
  const SCENE_RE = {
    '清洁洗护': /家居日用|家清|清洁|洗护|个护产品/, '收纳整理': /家居|收纳/, '家纺床品': /家居|家纺|床品/, '家装好物': /家居|家电|家装/,
    '护肤保养': /护肤|美妆|美容仪器/, '彩妆种草': /彩妆|美妆|化妆/, '个护洗护': /个护|洗护|清洁/, '香水香氛': /香水|香氛|美妆/,
    '通勤穿搭': /服装|穿搭|服饰/, '约会穿搭': /服装|穿搭/, '运动休闲': /运动户外|服装/, '配饰鞋包': /鞋靴|箱包|配饰/,
    '零食测评': /食品|零食/, '餐厅探店': /本地生活|餐饮|探店/, '饮品甜品': /食品|饮品/, '下厨料理': /家电|厨|料理/,
    '酒店民宿': /旅游|酒店|出行/, '景点攻略': /旅游|旅行|出行/, '出行装备': /运动户外|出行/, '亲子旅行': /旅游|亲子|母婴/,
    '减脂塑形': /健身|运动|医疗/, '瑜伽普拉提': /运动|健身/, '运动装备': /运动户外/, '健康饮食': /健康|医疗|食品/,
    '奶粉辅食': /母婴|辅食|食品/, '玩具用品': /母婴|玩具/, '早教启蒙': /母婴|教育|早教/, '孕产护理': /母婴|医疗/,
    '手机电脑': /3C|数码|科技/, '智能穿戴': /数码|科技|3C/, '影音设备': /3C|数码|家电/, '效率工具': /数码|办公|科技|教育/,
    '语言学习': /教育|培训|留学/, '考证升学': /教育|培训/, '知识付费': /教育|知识/, '学习方法': /教育|学习/,
    '猫犬用品': /宠物/, '宠物食品': /宠物|食品/, '萌宠日常': /宠物|萌宠/, '医疗护理': /宠物|医疗/,
    '职场穿搭': /服装|职场/, '副业成长': /职场|教育/, '办公好物': /办公|家居|数码/,
    '婚纱礼服': /服装|婚纱/, '婚礼策划': /婚礼|婚庆/, '婚戒珠宝': /珠宝|婚戒/, '蜜月旅行': /旅游|蜜月|出行/,
  };
  const BUDGET_CAP = { '1万以内': 10000, '1-5万': 50000, '5-10万': 100000, '10-50万': 500000, '50万以上': Infinity };
  function audFit(k, aud) {
    if (!aud) return true;
    const th = k.themes + k.fullcat;
    if (aud === '宝妈群体') return /亲子|育儿|母婴/.test(th);
    if (aud === '白领群体') return /职场|办公|人脉|中年/.test(th);
    if (aud === '学生群体') return k.a18 >= 30;
    if (aud === '18-24岁女性') return k.a18 >= 20;
    if (aud === '25-34岁女性') return k.a25 >= 25;
    if (aud === '35-44岁女性') return k.a35 >= 30;
    return true;
  }
  let gidSeq = 0;
  function guideMsg(kind, q, extra) {
    const m = { id: newMid(), role: 'assistant', type: 'guide', data: Object.assign({ kind, q, gid: 'g' + (++gidSeq), answers: {} }, extra || {}) };
    act().msgs.push(m);
    appendMsg(guideHTML(m));
    return m;
  }
  const gchips = (list, kind, picked) => `<div class="rc-guide${picked ? ' is-locked' : ''}" data-gkind="${kind}">`
    + list.map((v) => `<button data-gval="${mesc(v)}"${picked ? ' disabled' : ''}${picked === v ? ' class="is-picked"' : ''}>${mesc(v)}</button>`).join('')
    + (picked ? `<span class="rc-guide-done">✓ ${mesc(picked)}</span>` : '') + '</div>';
  function guideHTML(m) {
    const d = m.data, a = d.answers;
    let body = '';
    if (d.kind === 'category') body = gchips(WIZ.cats, 'category', a.category);
    else if (d.kind === 'scene') body = gchips(WIZ.scenes[d.cat] || [], 'scene', a.scene);
    else if (d.kind === 'audience') body = gchips(WIZ.audiences, 'audience', a.audience);
    else if (d.kind === 'budget') body = gchips(WIZ.budgets, 'budget', a.budget);
    else if (d.kind === 'last') body = '<p class="rc-guide-sub">合作预算（跳过选「不限预算」）</p>' + gchips(WIZ.budgets, 'budget', a.budget)
      + '<p class="rc-guide-sub">达人粉丝量级</p>' + gchips(WIZ.tiers, 'tier', a.tier);
    else if (d.kind === 'confirm') body = a.confirm
      ? `<div class="rc-guide is-locked" data-gkind="confirm"><button data-gval="__go" class="is-picked">🚀 开始推荐</button><span class="rc-guide-done">✓ 已确认</span></div>`
      : '<div class="rc-guide" data-gkind="confirm"><button data-gval="__go">🚀 开始推荐</button><button data-gval="__back">🔧 重新选择</button></div>';
    return `<div class="rc-msg rc-msg--ai rc-msg--guide" data-gid="${d.gid}"><div class="rc-guidebox"><p class="rc-guide-q">${mesc(d.q)}</p>${body}</div></div>`;
  }

  /* ── 对话入口：先做关键词语义识别，命中→确认缺字段；未命中→分步点选 ── */
  async function handleSend(text) {
    text = String(text || '').trim();
    if (!text || S.sending) return;
    const c = app.querySelector('[data-input]'); if (c) c.value = '';
    userSay(text);
    S.sending = true; refreshComposer();
    track('demo_action', { product: 'match', action: 'chat_send', source });

    const msg = text.toLowerCase();
    const ctx = act().ctx;

    // 负面反馈 -> 排除本批换一批
    if (NEG_WORDS.some((w) => text.includes(w)) && ctx.recNames.length) {
      aiSay('好的，已排除这些达人，正在为你重新筛选...', 'thinking');
      ctx.excluded = [...new Set([...ctx.excluded, ...ctx.recNames])];
      await msleep(700);
      await runRecommend(true);
      return;
    }

    // 关键词识别：品类 / 细分场景 / 预算 / 人群
    if (!ctx.category && CAT_HINT_WORDS.some((w) => text.includes(w))) {
      ctx.category = text.includes('家清') || text.includes('家居') || text.includes('洗衣') || text.includes('清洁') ? '家居生活'
        : text.includes('母婴') || text.includes('宝宝') || text.includes('育儿') ? '母婴育儿'
        : text.includes('美食') || text.includes('零食') || text.includes('饮料') ? '美食探店'
        : text.includes('美妆') || text.includes('护肤') || text.includes('彩妆') ? '美妆个护'
        : text.includes('穿搭') || text.includes('时尚') ? '穿搭时尚'
        : text.includes('数码') || text.includes('科技') ? '数码科技'
        : text.includes('旅行') || text.includes('酒店') ? '旅行出行'
        : text.includes('健身') || text.includes('运动') ? '健身运动'
        : text.includes('宠物') ? '宠物萌宠'
        : text.includes('教育') ? '教育学习'
        : text.includes('婚礼') ? '婚礼婚嫁' : '职场成长';
    }
    if (/洗衣液|洗衣原液|洗护|去渍|留香/.test(text) && ctx.category === '家居生活' && !ctx.scene) ctx.scene = '清洁洗护';
    if (!ctx.budget) {
      if (/1万以内|不到1万|少于1万/.test(msg)) ctx.budget = '1万以内';
      else if (/5万以内|不到5万|少于5万/.test(msg)) ctx.budget = '1-5万';
      else if (/5-10万|10万以内|不到10万/.test(msg)) ctx.budget = '5-10万';
      else if (/10-50万|50万以内/.test(msg)) ctx.budget = '10-50万';
      else if (/50万以上|超过50万/.test(msg)) ctx.budget = '50万以上';
    }
    if (!ctx.audience) {
      if (/宝妈/.test(msg)) ctx.audience = '宝妈群体';
      else if (/白领|职场|办公/.test(msg)) ctx.audience = '白领群体';
      else if (/学生|大学|校园/.test(msg)) ctx.audience = '学生群体';
      else if (/25-34/.test(msg)) ctx.audience = '25-34岁女性';
      else if (/18-24|年轻/.test(msg)) ctx.audience = '18-24岁女性';
      else if (/全年龄|所有/.test(msg)) ctx.audience = '全年龄段';
    }
    if (/汰渍|洗衣|家清/.test(msg)) { if (!ctx.category) ctx.category = '家居生活'; if (!ctx.scene && ctx.category === '家居生活') ctx.scene = '清洁洗护'; if (!ctx.audience) ctx.audience = '宝妈群体'; }

    const sess = S.sessions.find((x) => x.id === S.cur);
    if (sess && sess.title === '新对话') sess.title = ctx.category ? '找' + ctx.category + '博主' : text.slice(0, 8);
    await msleep(420);

    if (!ctx.category) {
      aiSay('我还没从你的描述里识别出品类，没关系，咱们按步骤来，点选就行 👇');
      guideMsg('category', '第一步：你要推广的产品属于哪个大类？');
      S.sending = false; refreshComposer();
      return;
    }

    // 命中品类：回放识别结果，缺什么点什么
    let say = `我识别到你的需求：${ctx.category}${ctx.scene ? ' · ' + ctx.scene : ''} 方向`;
    if (ctx.audience) say += `，面向${ctx.audience}`;
    if (ctx.budget) say += `，预算${ctx.budget}`;
    aiSay(say + '。');
    if (!ctx.audience) guideMsg('audience', '还差一个目标人群，点选确认，我按粉丝画像去库里筛：');
    else if (!ctx.budget) guideMsg('budget', '再确认一下合作预算：');
    else guideMsg('confirm', '方向和参数都齐了，直接开跑？');
    S.sending = false; refreshComposer();
  }

  /* ── 点选推进 ── */
  function pickGuide(btn) {
    const holder = btn.closest('[data-gid]');
    const m = act().msgs.find((x) => x.data && x.data.gid === holder.getAttribute('data-gid')); if (!m) return;
    const d = m.data, kind = btn.closest('[data-gkind]').dataset.gkind, val = btn.dataset.gval;
    const ctx = act().ctx;
    if (kind === 'confirm') {
      d.answers.confirm = val;
      holder.outerHTML = guideHTML(m);
      track('demo_action', { product: 'match', action: 'guide_confirm_' + val, source });
      if (val === '__go') finishGuide();
      else { ctx.category = ''; ctx.scene = ''; guideMsg('category', '没问题，重新来：先选一个大类 👇'); }
      scrollChatBottom(); return;
    }
    d.answers[kind] = val;
    if (kind === 'category') ctx.category = val;
    if (kind === 'scene') ctx.scene = val;
    if (kind === 'audience') ctx.audience = val;
    if (kind === 'budget') ctx.budget = val === '不限预算' ? '' : val;
    if (kind === 'tier') ctx.tier = val === '不限' ? '' : val;
    track('demo_action', { product: 'match', action: 'guide_' + kind, source });
    holder.outerHTML = guideHTML(m);
    if (d.kind === 'category') guideMsg('scene', `好的，${ctx.category}～第二步：选一个细分场景：`, { cat: ctx.category });
    else if (d.kind === 'scene') guideMsg('audience', '第三步：目标人群选一下：');
    else if (d.kind === 'audience') guideMsg('last', '收到！最后两个投放参数（都可跳过）：');
    else if (d.kind === 'last' && d.answers.budget && d.answers.tier) finishGuide();
    else if (d.kind === 'budget') finishGuide();
    scrollChatBottom();
  }
  function finishGuide() {
    const ctx = act().ctx;
    let intro = '明白了！我来帮你找' + ctx.category + (ctx.scene ? ' · ' + ctx.scene : '') + '领域的达人';
    if (ctx.audience) intro += `，面向${ctx.audience}`;
    if (ctx.budget) intro += `，预算${ctx.budget}`;
    if (ctx.tier) intro += `，${ctx.tier}`;
    intro += '。正在筛选中...';
    aiSay(intro, 'thinking');
    setTimeout(() => runRecommend(false), 600);
  }

  /* ── 流式推荐（mock SSE：逐张出卡片） ── */
  async function runRecommend(isSwap) {
    const ctx = act().ctx;
    const catRe = CAT_RE[ctx.category] || null;
    const scRe = SCENE_RE[ctx.scene] || null;
    const cap = BUDGET_CAP[ctx.budget] || Infinity;
    const tierOk = (k) => !ctx.tier || (ctx.tier.indexOf('头部') === 0 ? k.followers >= 500000
      : ctx.tier.indexOf('腰部') === 0 ? (k.followers >= 100000 && k.followers < 500000) : k.followers < 100000);
    let pool = KOLS.filter((k) => k.batch !== 0 && !ctx.excluded.includes(k.name));
    const catHits = catRe ? pool.filter((k) => catRe.test(k.fullcat + ' ' + k.accepts)) : [];
    const relaxed = catRe ? catHits.length < 3 : false;
    if (catHits.length >= 3) pool = catHits;
    if (!pool.length) pool = KOLS.filter((k) => k.batch !== 0 && !ctx.excluded.includes(k.name));
    if (!pool.length) pool = KOLS.filter((k) => k.batch !== 0);
    const fit = (k) => (catRe && catRe.test(k.fullcat + ' ' + k.accepts) ? 2 : 0)
      + (scRe && scRe.test(k.accepts + ' ' + k.themes + ' ' + k.persona) ? 2 : 0)
      + (audFit(k, ctx.audience) ? 1.5 : 0)
      + (k.price <= cap ? 1 : 0)
      + (tierOk(k) ? 1 : 0)
      + k.score / 100;
    const list = pool.slice().sort((a, b) => fit(b) - fit(a)).slice(0, 6);
    ctx.recNames = list.map((k) => k.name);
    S.streaming = true;
    const el = chatScrollEl();
    let tip = null;
    if (el) {
      tip = document.createElement('div');
      tip.className = 'rc-msg rc-msg--ai is-thinking';
      tip.setAttribute('data-streamtip', '1');
      tip.innerHTML = '<i class="rc-spin"></i>正在筛选达人...';
      el.appendChild(tip); scrollChatBottom();
    }
    await msleep(900);

    const mid = newMid();
    const avg = Math.round(list.reduce((s, k) => s + k.score, 0) / list.length);
    const reqDesc = [ctx.category, ctx.scene, ctx.audience, ctx.budget && ('预算' + ctx.budget), ctx.tier].filter(Boolean).join(' · ') || '对话上下文';
    const relaxNote = relaxed && catRe ? `（样例库中「${ctx.category}」类达人不足 3 位，已放宽到全库按契合度排序）` : '';
    const summary = `根据你的需求（${reqDesc}），我从达人库中为你匹配了 ${list.length} 位达人，综合匹配度 ${avg}%。已按接单品类、内容主题、粉丝年龄段占比与图文报价逐项过滤${relaxNote}。建议优先联系前两位锁档，其余可作为组合排期补充。`;
    const m = { id: mid, role: 'assistant', content: summary, type: 'result', data: { influencers: [] } };
    act().msgs.push(m);
    const node = appendMsg(resultBlockHTML(m));
    const grid = node && node.querySelector('[data-grid]');
    for (let i = 0; i < list.length; i++) {
      if (!grid) break;
      m.data.influencers.push(list[i]);
      grid.insertAdjacentHTML('beforeend', cardHTML(list[i], i));
      animateRing(grid.lastElementChild);
      scrollChatBottom();
      await msleep(matchMedia('(prefers-reduced-motion: reduce)').matches ? 60 : 380);
    }
    if (tip) tip.remove();
    if (node) { const tt = node.querySelector('[data-total]'); if (tt) tt.textContent = list.length; }
    S.streaming = false;
    const sess = S.sessions.find((x) => x.id === S.cur);
    if (sess) { sess.count = list.length; sess.ts = Date.now(); }
    track('demo_action', { product: 'match', action: isSwap ? 'swap_batch' : 'recommend_done', n: list.length, source });
    S.sending = false; refreshComposer();
  }

  function animateRing(cardEl) {
    const arc = cardEl && cardEl.querySelector('.rc-ring-arc'); if (!arc) return;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      arc.style.transition = 'stroke-dashoffset 1s ease-out';
      arc.setAttribute('stroke-dashoffset', arc.dataset.off);
    }));
  }

  function refreshComposer() {
    const ta = app.querySelector('[data-input]'), btn = app.querySelector('[data-act="send"]');
    if (ta) ta.disabled = S.sending; if (btn) btn.disabled = S.sending;
  }

  /* ── 选择 & 导出 CSV（本地真实下载，数据为 mock） ── */
  function syncSelectionUI() {
    app.querySelectorAll('[data-selcount]').forEach((x) => { x.textContent = S.selected.size; });
    const btn = app.querySelector('[data-act="export"]'); if (btn) btn.disabled = !S.selected.size;
    app.querySelectorAll('.rc-result').forEach((r) => {
      const mid = r.getAttribute('data-mid');
      const msg = act().msgs.find((x) => x.id === mid); if (!msg || !msg.data) return;
      const all = msg.data.influencers.length && msg.data.influencers.every((k) => S.selected.has(k.name));
      const ck = r.querySelector('.rc-check'); if (ck) { ck.classList.toggle('is-on', !!all); ck.textContent = all ? '✓' : ''; }
    });
  }

  function exportCSV() {
    const rows = KOLS.filter((k) => S.selected.has(k.name));
    if (!rows.length) return;
    const heads = ['达人昵称', '主页链接', '账号类型', '人设', '粉丝量', '女粉占比', '近28天活跃粉丝占比', '图文报价', '视频报价', '健康度', '城市', 'MCN机构', 'AI匹配度', '推荐理由'];
    const escC = (v) => { const s = String(v == null ? '' : v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const csv = '\ufeff' + [heads.join(','), ...rows.map((k) => [k.name, k.url, k.fullcat, k.persona, k.followers, k.female, k.active, k.price, k.vprice, k.health, k.city, k.mcn, k.score, k.reason].map(escC).join(','))].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url; a.download = `达人深度数据_${rows.length}人_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    track('demo_action', { product: 'match', action: 'export_csv', n: rows.length, source });
    toast(`已导出 ${rows.length} 位达人的深度数据（本地真实下载）`);
  }

  /* ============================================================ Tab2 达人库 */
  const LIB_CATS = ['all', ...new Set(KOLS.map((k) => k.cat))];
  const PAGE_SIZE = 8;
  function libFiltered() {
    const q = S.libQuery.trim().toLowerCase();
    return KOLS.filter((k) => (S.libCat === 'all' || k.cat === S.libCat)
      && (!q || k.name.toLowerCase().includes(q) || k.persona.toLowerCase().includes(q) || k.city.toLowerCase().includes(q)));
  }
  function libraryPane() {
    const rows = libFiltered();
    const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
    if (S.libPage >= pages) S.libPage = 0;
    const slice = rows.slice(S.libPage * PAGE_SIZE, S.libPage * PAGE_SIZE + PAGE_SIZE);
    const totalF = KOLS.reduce((s, k) => s + k.followers, 0);
    return `<div class="rc-lib">
      <div class="rc-stats">
        <div class="rc-stat"><b>${KOLS.length}</b><span>Demo 达人数（线上库 8,359 位）</span></div>
        <div class="rc-stat"><b>${(totalF / 10000).toFixed(0)}w</b><span>粉丝总规模</span></div>
        <div class="rc-stat"><b>${S.imported ? '已导入' : '预置'}</b><span>数据来源（飞书多维表格同步）</span></div>
        <button class="rc-btn-sync" data-act="sync"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6" stroke-linecap="round" stroke-linejoin="round"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" stroke-linecap="round" stroke-linejoin="round"/></svg>从飞书同步</button>
      </div>
      <div class="rc-libtools">
        <div class="rc-search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35" stroke-linecap="round"/></svg>
          <input data-libq placeholder="搜索昵称 / 人设 / 城市..." value="${mesc(S.libQuery)}"/></div>
        <select data-libcat class="rc-select">${LIB_CATS.map((c) => `<option value="${mesc(c)}"${S.libCat === c ? ' selected' : ''}>${c === 'all' ? '全部品类' : mesc(c)}</option>`).join('')}</select>
      </div>
      <div class="rc-tablewrap"><table class="rc-table">
        <thead><tr><th></th><th>达人昵称</th><th>账号类型</th><th>粉丝量</th><th>女粉占比</th><th>图文报价</th><th>健康度</th><th>城市</th></tr></thead>
        <tbody>${slice.map((k) => `<tr class="rc-trow${S.libOpen === k.name ? ' is-open' : ''}" data-krow="${mesc(k.name)}">
            <td class="rc-td-i">${S.libOpen === k.name ? '−' : '+'}</td>
            <td><span class="rc-tname"><img src="${avatar(k.name)}" alt=""/>${mesc(k.name)}</span></td>
            <td>${mesc(k.fullcat)}</td><td class="rc-num">${mesc(k.fdisp)}</td><td class="rc-num">${mesc(k.female)}</td>
            <td class="rc-num">${yuan(k.price)}</td>
            <td><span class="rc-health${k.health === '优秀' ? ' is-ok' : ''}">${mesc(k.health || '—')}</span></td>
            <td>${mesc(k.city.split(' ')[0] || k.city)}</td></tr>
          ${S.libOpen === k.name ? `<tr class="rc-tdetail"><td></td><td colspan="7">
            <div class="rc-detail-grid">
              ${[['人设', k.persona], ['内容形式', '图文为主'], ['近28天活跃粉丝', k.active || '—'], ['视频报价', k.vprice ? yuan(k.vprice) : '—'], ['MCN机构', k.mcn || '—'], ['主页', '']]
                .map(([l, v], i) => `<div class="rc-dcell"><span>${l}</span>${i === 5 ? `<a href="${mesc(k.url)}" target="_blank" rel="noopener noreferrer">查看主页 ↗</a>` : `<b>${mesc(v || '—')}</b>`}</div>`).join('')}
            </div></td></tr>` : ''}`).join('') || `<tr><td colspan="8" class="rc-empty-td">没有匹配的达人，换个关键词试试</td></tr>`}
        </tbody></table></div>
      <div class="rc-pager">
        <button data-page="prev" ${S.libPage === 0 ? 'disabled' : ''}>‹ 上一页</button>
        <span>${S.libPage + 1} / ${pages}</span>
        <button data-page="next" ${S.libPage >= pages - 1 ? 'disabled' : ''}>下一页 ›</button>
      </div>
    </div>`;
  }

  /* ============================================================ Tab3 导入 */
  function importPane() {
    return `<div class="rc-import"><div class="rc-import-head">
        <h2>导入达人数据</h2><p>支持 Excel (.xlsx, .xls) 和 CSV (.csv) 格式导入</p></div>
      <div class="rc-drop" data-act="fakefile" role="button" tabindex="0">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <b>拖拽文件到这里，或点击选择文件</b><span>.xlsx / .xls / .csv，≤10MB</span></div>
      <div class="rc-import-or">— 演示环境推荐使用 —</div>
      <button class="rc-btn-import" data-act="oneimport">${S.imported ? '✓ 已导入' : ''} 📥 一键导入 ${KOLS.length} 位真实样例达人</button>
      <p class="rc-import-note">预置样例来自线上库的真实脱敏数据（含粉丝画像、报价、MCN、健康度等 40+ 字段）。真实导入需在系统内解析并写入本地达人 store。</p>
    </div>`;
  }

  async function oneImport() {
    if (S.imported) { S.tab = 'library'; render(); return; }
    const btn = app.querySelector('[data-act="oneimport"]');
    if (btn) { btn.disabled = true; btn.textContent = '解析中…'; }
    await msleep(1100);
    S.imported = true;
    track('demo_action', { product: 'match', action: 'one_import', source });
    toast(`导入完成：${KOLS.length} 位达人已写入本地达人库`);
    S.tab = 'library'; render();
  }

  /* ============================================================ 弹窗 */
  function modalHTML() {
    if (S.modal === 'settings') return `<div class="rc-mask" data-close="1"><div class="rc-modal" role="dialog" aria-label="设置">
      <div class="rc-modal-head"><h3>⚙️ 系统设置</h3><button data-act="closemodal" aria-label="关闭">×</button></div>
      <div class="rc-modal-body">
        <p class="rc-modal-sec">LLM 配置</p>
        <label class="rc-field"><span>API Base URL</span><input value="${mesc(S.settings.llmUrl)}" readonly/></label>
        <label class="rc-field"><span>API Key</span><input value="${mesc(S.settings.apiKey)}" readonly/></label>
        <label class="rc-field"><span>Model</span><input value="${mesc(S.settings.model)}" readonly/></label>
        <p class="rc-modal-sec">飞书配置</p>
        <label class="rc-field"><span>App ID</span><input value="${mesc(S.settings.feishuApp)}" readonly/></label>
        <label class="rc-field"><span>App Secret</span><input value="${mesc(S.settings.feishuSecret)}" readonly/></label>
        <label class="rc-field"><span>多维表格 Table ID</span><input value="${mesc(S.settings.feishuTable)}" readonly/></label>
      </div>
      <div class="rc-modal-foot"><button class="rc-btn-primary" data-act="saveSettings">保存配置</button></div>
    </div></div>`;
    if (S.modal === 'fakefile') return `<div class="rc-mask" data-close="1"><div class="rc-modal rc-modal--sm" role="alertdialog">
      <div class="rc-modal-head"><h3>🧪 当前是模拟环境</h3><button data-act="closemodal" aria-label="关闭">×</button></div>
      <div class="rc-modal-body"><p>演示页面不会读取你选择的真实文件。请使用「<b>📥 一键导入 ${KOLS.length} 位真实样例达人</b>」体验完整导入链路。</p></div>
      <div class="rc-modal-foot"><button class="rc-btn-primary" data-act="closemodal">知道了</button></div>
    </div></div>`;
    return '';
  }

  /* ============================================================ 事件绑定 */
  app.addEventListener('click', (e) => {
    const t = e.target;
    const tab = t.closest('[data-tab]');
    if (tab) { S.tab = tab.dataset.tab; render(); track('demo_action', { product: 'match', action: 'tab_' + S.tab, source }); return; }
    if (t.closest('[data-act="fold"]')) { S.sidebarCollapsed = !S.sidebarCollapsed; render(); return; }
    if (t.closest('[data-act="newchat"]')) {
      S.cur = 'cur'; const cs = act(); cs.msgs = []; cs.ctx = freshCtx(); cs.title = '新对话'; cs.count = 0; cs.ts = Date.now();
      S.selected = new Set(); render(); return;
    }
    const side = t.closest('[data-sel]');
    if (side) { if (S.cur !== side.dataset.sel) { S.cur = side.dataset.sel; render(); } return; }
    if (t.closest('[data-act="preset"]')) {
      const ta = app.querySelector('[data-input]'); if (ta) { ta.value = PRESET_BRIEF; ta.focus(); }
      return;
    }
    if (t.closest('[data-act="send"]')) { const ta = app.querySelector('[data-input]'); handleSend(ta && ta.value); return; }
    const gbtn = t.closest('[data-gval]');
    if (gbtn && !gbtn.disabled) { pickGuide(gbtn); return; }
    if (t.closest('[data-act="selall"]')) {
      const btn = t.closest('[data-act="selall"]');
      const msg = act().msgs.find((x) => x.id === btn.dataset.mid); if (!msg) return;
      const all = msg.data.influencers.every((k) => S.selected.has(k.name));
      msg.data.influencers.forEach((k) => all ? S.selected.delete(k.name) : S.selected.add(k.name));
      app.querySelectorAll('[data-pick]').forEach((cb) => { cb.checked = !all && msg.data.influencers.some((k) => k.name === cb.dataset.pick) ? !all : cb.checked; });
      // 简化：整表重刷 checkbox 状态
      app.querySelectorAll('[data-pick]').forEach((cb) => { cb.checked = S.selected.has(cb.dataset.pick); });
      syncSelectionUI(); return;
    }
    if (t.closest('[data-act="export"]')) { exportCSV(); return; }
    const krow = t.closest('[data-krow]');
    if (krow) { S.libOpen = S.libOpen === krow.dataset.krow ? null : krow.dataset.krow; render(); return; }
    const pg = t.closest('[data-page]');
    if (pg) { S.libPage += pg.dataset.page === 'next' ? 1 : -1; render(); return; }
    if (t.closest('[data-act="sync"]')) { toast('飞书同步需在真实环境校验 App Token，演示环境使用预置库'); return; }
    if (t.closest('[data-act="oneimport"]')) { oneImport(); return; }
    if (t.closest('[data-act="fakefile"]')) { S.modal = 'fakefile'; render(); return; }
    if (t.closest('[data-act="settings"]')) { S.modal = 'settings'; render(); return; }
    if (t.closest('[data-act="saveSettings"]')) { S.modal = null; toast('演示环境配置已锁定，保存仅在真实系统中生效'); render(); return; }
    if (t.closest('[data-act="closemodal"]') || (t.classList && t.classList.contains('rc-mask'))) { S.modal = null; render(); return; }
  });
  app.addEventListener('change', (e) => {
    const cb = e.target.closest('[data-pick]');
    if (cb) { cb.checked ? S.selected.add(cb.dataset.pick) : S.selected.delete(cb.dataset.pick); syncSelectionUI(); return; }
    if (e.target.matches('[data-libq]')) { S.libQuery = e.target.value; S.libPage = 0; render(); return; }
    if (e.target.matches('[data-libcat]')) { S.libCat = e.target.value; S.libPage = 0; render(); return; }
  });
  app.addEventListener('input', (e) => {
    if (e.target.matches('[data-libq]')) {
      const el = e.target;
      clearTimeout(el._t);
      el._t = setTimeout(() => { S.libQuery = el.value; S.libPage = 0; render(); const n = app.querySelector('[data-libq]'); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }, 350);
      return;
    }
    if (e.target.matches('[data-input]')) {
      const btn = app.querySelector('[data-act="send"]'); if (btn && !S.sending) btn.disabled = !e.target.value.trim();
    }
  });
  app.addEventListener('keydown', (e) => {
    if (e.target.matches('[data-input]') && e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e.target.value); }
  });

  /* 局部刷新：搜索/翻页不整页 render（防抖已保证，其余保持轻量） */

  window.__RC_DBG = { S, handleSend, runRecommend };
  render();
  track('demo_start', { product: 'match', input_type: 'chat_demo', source });
  window.__RC_REFRESH__ = render;
}
