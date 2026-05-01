/* === 艾尔德兰 独立悬浮地图模块 V7.7 (加入生物追踪功能) === */
(function() {
    $('#aelderan-map-wrapper, #aelderan-map-css, #aelderan-map-drag-overlay').remove();
    $(document).off('.aelderanmap');

    var MAP_CONFIG = {
        storageCollapse: 'aelderan_map_collapsed_v1'
    };

    function SvgIcon(iconName, size) {
        if (!size) size = '1.2em';
        return '<img src="https://api.iconify.design/' + iconName + '.svg" style="width: ' + size + '; height: ' + size + '; vertical-align: -0.15em; display: inline-block; pointer-events: none;" />';
    }

    // --- 动态种族头像雷达 ---
    function getAvatarIcon(raceName) {
        var r = (raceName || '').toLowerCase();
        var s = '1.4em';
        if (r.indexOf('精灵') !== -1 && r.indexOf('黑暗') === -1) return SvgIcon('twemoji:elf', s);
        if (r.indexOf('黑暗精灵') !== -1 || r.indexOf('暗影精灵') !== -1) return SvgIcon('twemoji:elf-dark-skin-tone', s);
        if (r.indexOf('矮人') !== -1) return SvgIcon('twemoji:man-beard', s);
        if (r.indexOf('兽人') !== -1 || r.indexOf('半兽人') !== -1) return SvgIcon('twemoji:ogre', s);
        if (r.indexOf('血族') !== -1 || r.indexOf('吸血鬼') !== -1 || r.indexOf('凋亡') !== -1) return SvgIcon('twemoji:vampire', s);
        if (r.indexOf('恶魔') !== -1 || r.indexOf('魅魔') !== -1) return SvgIcon('twemoji:smiling-face-with-horns', s);
        if (r.indexOf('龙') !== -1) return SvgIcon('twemoji:dragon-face', s);
        if (r.indexOf('鱼人') !== -1 || r.indexOf('海精灵') !== -1 || r.indexOf('娜迦') !== -1) return SvgIcon('twemoji:merman', s);
        if (r.indexOf('仙人') !== -1 || r.indexOf('修仙') !== -1) return SvgIcon('twemoji:person-in-lotus-position', s);
        if (r.indexOf('夺心魔') !== -1) return SvgIcon('twemoji:alien-monster', s);
        return SvgIcon('twemoji:person', s);
    }

    var mapState = {
        isCollapsed: localStorage.getItem(MAP_CONFIG.storageCollapse) !== 'false',
        zoomLevel: 100,
        infoPanelOpen: true
    };

    // --- 全方位探测雷达 & 安全提取工具 ---
    function getMvuDataSafe() {
        const checkObj = (win) => {
            try {
                let testData = null;
                if (win.Mvu && typeof win.Mvu.getMvuData === 'function') testData = win.Mvu.getMvuData({ type: 'message', message_id: 'latest' })?.stat_data;
                if (!testData && win.mag_var_update && win.mag_var_update.data) testData = win.mag_var_update.data;
                if (!testData && win.Mvu?.data_service?.vars) testData = win.Mvu.data_service.vars;
                return (testData && testData.stat_data) ? testData.stat_data : testData;
            } catch(e) { return null; }
        };
        return checkObj(window) || checkObj(window.parent) || checkObj(window.top) || {};
    }

    const getVal = (data, path, def = '无') => {
        if (!data) return def; let current = data;
        try { const keys = path.split('.'); for (const key of keys) { if (current === undefined || current === null) return def; current = current[key]; } return (current !== undefined && current !== null && current !== '') ? current : def; } catch (e) { return def; }
    };
    // ----------------------------------------------------

    // 基础预设坐标库
    var locationCoords = {
        '光辉之城': {x: 50, y: 48}, '自由城邦': {x: 57, y: 47},
        '枫叶镇': {x: 42, y: 53},
        '铁砧堡': {x: 37, y: 42}, '河湾镇': {x: 52, y: 64},
        '银泉城': {x: 43, y: 60}, '绿野镇': {x: 57, y: 52},
        '碎湾镇': {x: 45, y: 65}, '诅咒港': {x: 71, y: 65},
        '橡木村': {x: 54, y: 37}, '河木村': {x: 50, y: 54},
        '灰谷营地': {x: 35, y: 55}, '北风隘口': {x: 45, y: 23},
        '锈铁峡谷': {x: 35, y: 30}, '鸦巢': {x: 60, y: 33},
        '狮鹫崖': {x: 63, y: 42}, '蝎狮洞': {x: 65, y: 65},
        '血蔷薇城': {x: 45, y: 34}, '恶魔传送阵': {x: 42, y: 38},

        '血蹄营地': {x: 45, y: 12}, '裂石堡': {x: 53, y: 16},
        '风嚎哨站': {x: 62, y: 18}, '霜狼村': {x: 45, y: 17},
        '冰风谷': {x: 61, y: 13},
        '先祖之柱': {x: 53, y: 25}, '裂蹄营地': {x: 54, y: 9},
        '雪蹄村': {x: 38, y: 12},
        '星耀树城': {x: 73, y: 33},
        '翠荫哨站': {x: 70, y: 39}, '月溪镇': {x: 74, y: 53},
        '鹿角村': {x: 69, y: 53}, '银月村': {x: 75, y: 62},
        '晨露村': {x: 84, y: 42}, '蛇人废墟': {x: 82, y: 53},
        '远古树墓': {x: 79, y: 38}, '林海之门': {x: 68, y: 45},
        '铁炉堡': {x: 28, y: 73}, '暗影城': {x: 18, y: 68},
        '荧光洞窟': {x: 25, y: 87}, '灰岩要塞': {x: 30, y: 71},
        '灵吸城': {x: 25, y: 78}, '符文工坊': {x: 26, y: 56},
        '蛛网镇': {x: 18, y: 73}, '幽暗哨站': {x: 29, y: 65},
        '贝城': {x: 58, y: 64}, '碎骨码头': {x: 67, y: 26},
        '巨龟礁': {x: 57, y: 82}, '海盗群岛': {x: 43, y: 82},
        '珊瑚村': {x: 62, y: 58}, '海藻镇': {x: 40, y: 74},

        '旋涡城': {x: 5, y: 42}, '风暴神殿': {x: 25, y: 33},
        '雷电神庙': {x: 15, y: 22}, '沉船墓地': {x: 10, y: 50},
        '深渊哨站': {x: 20, y: 30},
        '龙骨熔炉': {x: 88, y: 13}, '龙息岛': {x: 92, y: 28},
        '燃烬镇': {x: 80, y: 10}, '灰烬港': {x: 80, y: 22},
        '孵化场': {x: 85, y: 20},
        '恶魔城': {x: 78, y: 84}, '深渊之门': {x: 83, y: 93},
        '白玉京': {x: 95, y: 75}, '望仙渡': {x: 88, y: 92},
        '剑庐': {x: 95, y: 88}, '冥河渡口': {x: 82, y: 78}
    };

    // --- 内置：艾尔德兰全息地理志字典 ---
    var locationInfoData = {
        '光辉之城': '座落于裂隙平原的中央心脏地带，是埃瑟利亚王国不落的白色王都。巍峨的魔晶城墙上常年流转着抗魔结界的光辉，这里是无数年轻冒险者梦想启航之地，佣兵公会大厅日夜人声鼎沸。每当入夜，大教堂的钟声便会驱散平原游荡的低阶死灵，庇护着城墙内的众生。<br><br><span style="color:#d4af37; font-weight:bold;">◆ 圣光大教堂</span>：神圣教廷的权力中枢，圣女云璃的常驻之地。教堂穹顶镶嵌的巨型圣徽日夜散发着温和的治愈光环，地下隐秘的档案室藏有对抗深渊的终极神术卷轴。<br><br><span style="color:#d4af37; font-weight:bold;">◆ 奥术尖塔</span>：直插云霄的法师圣地，由传奇大法师梅林亲自设下禁制。塔内充斥着高浓度魔力游离粒子，是高阶法师们寻求真理与突破极限的必经之所。<br><br><span style="color:#d4af37; font-weight:bold;">◆ 圣光祭坛（十二祭坛之一）</span>：隐藏于光辉之城东郊的古老神殿遗迹中。尽管曾遭血月之纪的恶魔染指，残存的圣光刻印仍在顽强地净化着周遭的腐化气息，神圣骑士长加里奥常年在此肃清邪祟。',
        '自由城邦': '位于光辉之城以东，是一座不受任何王权约束的绝对中立销金窟。这里没有宏伟的城墙，取而代之的是由<q><q>“血鸦”</q></q>佣兵团严密把守的错综街道。全大陆最庞大的黑市交易网在此扎根，只要你有足够的金币，商会巨头加里维克斯甚至能为你弄来深渊恶魔的头角。<br><br><span style="color:#d4af37; font-weight:bold;">◆ 灰烬塔</span>：深埋于城邦地下的异端聚集地，空气中弥漫着危险的硫磺与魔药气味。这里进行着被教廷严令禁止的活体魔物实验，疯狂的炼金术师维克托在最深处守卫着他的造物。',
        '枫叶镇': '隐匿于裂隙平原的中西部边陲，紧邻着灰谷营地与铁砧堡。因其周围长满受火元素滋养的变异枫树，一年四季皆是一片如火的赤红。这里民风淳朴，镇长布朗热情好客，初出茅庐的剑士与学徒们常在此落脚，听酒馆里的老兵吹嘘当年的战斗。<br><br><span style="color:#d4af37; font-weight:bold;">◆ 万事屋</span>：一栋摇摇欲坠却又充满人情味的破旧木屋，老板坂田银时常年瘫在沙发上吃甜食。虽然看似极其不靠谱，但当镇子面临真正的威胁时，他手中的木刀却能斩断钢铁。',
        '铁砧堡': '矗立于裂隙平原中西部的钢铁要塞，正面对抗着北方荒原与西北异界裂缝的威胁。城墙上密密麻麻的刀劈斧凿痕迹，诉说着这里曾发生过无数次惨烈的怪物攻城战。要塞内熔炉的黑烟终年不散，独眼督军雷格纳以极其冷酷的铁腕手段统御着这里的守军。',
        '河湾镇': '位于大陆南部海岸线，是一处繁荣的跨种族走私与贸易枢纽。海水在这里呈现出奇异的双色分界，一半清澈一半浑浊。海港内停泊着造型各异的商船，走私头目<q><q>“疯狗”</q></q>洛克掌控着这里的地下航线，如果你想寻找前往南部群岛的偷渡船票，他是你唯一的选择。',
        '银泉城': '紧贴着南部丘陵地带，因城中一口永不干涸的魔法银泉而得名。这里是大陆最大的瑟银矿脉石转运站，空气中交织着矿石粉尘与奥术符文的嗡鸣。传奇铁匠布莱克大叔的工坊每天都挤满了求取名剑的剑客，当夜幕降临，银泉散发的微光还会吸引稀有的月光精灵在此出没。',
        '绿野镇': '坐落于裂隙平原中东部，是一片充满田园牧歌色彩的半身人乐土。这里的建筑低矮且圆润，胖厨娘玛格丽特的酒馆里永远供应着全大陆最丰盛的烤肉和增益麦酒。这里是流浪者们的避风港，即使在战火纷飞的年代，这里也保留着一份难得的宁静。<br><br><span style="color:#d4af37; font-weight:bold;">◆ 绿野祭坛（十二祭坛之一）</span>：藏于镇外花海中心的古老石阵，长满了散发着自然魔力的青苔。血月之纪时，半身人先知利用祭坛的力量张开结界，保全了这片土地。',
        '碎湾镇': '裂隙平原南部沿海的混乱之港，海岸线被可怕的潮汐魔力撕碎成无数暗礁。小镇是亡命之徒和流亡贵族的避风港，海盗王<q><q>“黑胡子”</q></q>萨奇的规矩就是这里唯一的法律。镇上的地下竞技场每天都在上演着血腥的生死决斗，赢家通吃，输家喂鱼。',
        '诅咒港': '位于大陆东南角边缘的阴森港口，是前往仙魔大陆的绝命航线起航点。这里的海水呈现出令人不安的暗紫色，码头上的木板浸透了无法洗刷的血迹。只有获得了教廷或深渊双重通行许可的勇士，才能雇佣到面如死灰的摆渡人卡戎，登上那艘千疮百孔的幽灵渡船。',
        '橡木村': '地处裂隙平原北部，是抵御冰原寒风的最后一道屏障。村庄四周环绕着高耸入云的远古战争橡木，村民多为体格健硕的猎人和游侠。老猎手赫恩掌握着失传已久的自然附魔弓技术，他带领着巡逻队，维持着人类与北方兽人之间脆弱的平衡。',
        '河木村': '位于光辉之城正南方，是一座被纵横交错的灌溉水渠环绕的宁静农业村落。巨大的风车是这里的地标，潺潺的流水声掩盖了大陆远方的战火。村口那口深不见底的古井，据说隐藏着通往古代地宫的通道，曾有孩童声称听到井底传来巨龙的鼾声。',
        '北风隘口': '裂隙平原最北端的咽喉要道，连接着终年积雪的北部荒原。这里刺骨的寒风足以瞬间冻毙缺乏准备的旅人，两侧如刀削般的悬崖上潜伏着致命的冰原潜伏者。守将风暴使者雷恩日夜凝视着风雪深处，警惕着冰霜巨熊之王<q><q>“碎骨者”</q></q>的袭击。',
        '锈铁峡谷': '位于铁砧堡以西的开阔地带，曾是一场上古神魔大战的绞肉机遗址。巨大的机械残骸和风化的远古巨兽骨架半掩埋在赤红色的沙土中，残留的狂暴能量场会让所有的指南针失灵。只有疯癫的半机械地精<q><q>“螺丝刀”</q></q>吉布斯敢于在此拾荒，寻找失落的远古科技。',
        '鸦巢': '位于橡木村东北峭壁，是垄断大陆符文魔法科技的寡头企业。漆黑高塔群释放紫红色精神脉冲与低频轰鸣。寒鸦族长老议会统领学者，擅闯者遭“铁驭”追杀。可学符文、买军工道具、接高死亡率委托。<br><br><span style="color:#d4af37; font-weight:bold;">◆ 寒鸦塔</span>：黑色方尖碑，顶层曾是彼岸花实验室，现已封锁但核心符文自运行。塔尖紫水晶发射引力波改变天象，塔内空间折叠。传说塔顶有“空间之镜”可传送至大陆任意地。<br><br><span style="color:#d4af37; font-weight:bold;">◆ 鸦巢图书馆</span>：藏有符文与禁忌学识典籍，仅议会学者可接入。馆内有十二祭坛与恶魔起源的绝密资料。',
        '狮鹫崖': '位于橡木村以东的陡峭断崖。罡风常年撕扯着这里的一切，只有最强壮的皇家狮鹫才敢在此筑巢。天空骑士团的团长阿兰常年在此驻扎，教导那些试图驯服天空霸主的年轻骑士，崖底堆满了试飞失败者的白骨。',
        '血蔷薇城': '血蔷薇城位于大陆西北部，是昔日绯红之国那被诅咒的王都废墟。残垣断壁间长满了嗜血的魔化蔷薇，夜晚红色的瘴气会唤醒沉睡的帝国亡魂。一位骑在骸骨战马上的亡灵大法师瑟兰迪尔在空旷的城中游荡，掌管着这片永恒的废墟。冒险者若想探寻凋亡血族的秘密，必须冒着被亡魂诅咒的风险深入废墟。<br><br><span style="color:#d4af37; font-weight:bold;">◆ 绯红祭坛（十二祭坛之一）</span>：位于王宫废墟地下的猩红大厅，其上刻满了令人作呕的深渊符文。墨菲斯曾在此撕裂空间壁垒，如今祭坛仍源源不断地散发着腐蚀心智的邪恶波动。',
        '恶魔传送阵': '紧邻血蔷薇城南方的焦土中心，一座巨大的、燃烧着地狱绿火的倒五芒星阵。尽管当年被英雄赤墓强行切断了主能源，但其溢出的邪能依然让周遭沦为寸草不生的死地。游侠将军希尔瓦丝率领着精锐弓箭手常年驻守于外围，射杀任何试图逃离裂隙的深渊犬。',

        '血蹄营地': '位于北部荒原边缘，空气中充斥着野兽的腥臊味与粗犷的号角声。这里的兽人战士们每日都在风雪中锤炼体魄，时刻准备着响应部落的战争召唤。',
        '雪蹄村': '位于荒原最西侧，是茫茫雪海中一处难得的避风港。这里的兽人擅长在极寒中生存，半地下的圆顶建筑能够有效抵御暴风雪的侵袭。老萨满<q><q>“风语者”</q></q>穆格掌握着古老的冰霜图腾术，总能在大雪封山前为族人寻得安息之所。',
        '裂蹄营地': '座落在北部荒原靠西的深处，是驯养战争巨兽裂蹄牛的专属营地。空气中充斥着野兽的腥臊味与粗犷的号角声，驯兽大师洛克汉挥舞着长鞭，指挥着如同移动堡垒般的牛群在冰原上迁徙，震撼着整片大地。',
        '霜狼村': '位于雪蹄村以东的冰原腹地，是精锐兽人骑兵霜狼氏族的故乡。每到夜晚，震耳欲聋的狼嚎声便会在冰原上回荡。霜狼酋长杜隆坦与他的巨狼兄弟并肩作战，任何对这片土地抱有敌意的闯入者，都会面临群狼不死不休的追捕。',
        '裂石堡': '霜狼村与冰风谷之间的坚固要塞，是兽人部落在荒原上最为核心的军事与贸易重镇。由巨大的黑曜石堆砌而成的城墙坚不可摧，城墙上架设着粗糙却致命的重型床弩。地精大统领加兹鲁维游走于各方势力之间，掌控着这里最为庞大的跨种族黑市贸易。',
        '风嚎哨站': '位于荒原东侧的制高点，时刻监视着平原与林海的动向。这里的风声犹如女妖的尖啸，鹰眼锐风常年立于哨塔之巅，他那锐利的目光能穿透茫茫暴风雪，哪怕是千米之外的一只雪兔也休想逃过他的索敌。',
        '冰风谷': '位于风嚎哨站以北的绝地峡谷，这里的温度足以在数秒内冻结沸水。谷底密布着锋利的冰刺陷阱，冰霜元素领主<q><q>“绝对零度”</q></q>在寒渊中沉睡。唯有携带龙焰火种的至强者，才敢踏入这片生命的禁区。<br><br><span style="color:#d4af37; font-weight:bold;">◆ 北境祭坛（十二祭坛之一）</span>：深埋于冰风谷最底层的千年玄冰之中。血月之纪时，冰雪女王曾用生命在此封印了深渊领主，如今靠近祭坛的人仍能听到冰层下传来不甘的恶魔咆哮。',
        '先祖之柱': '位于荒原东南边界，是兽人信仰的图腾发源地。数十根高达百米的巨型石柱直插苍穹，上面用鲜血涂抹着记载兽人荣耀历史的象形文字。大萨满耐奥祖在此聆听先祖的低语，每逢月圆之夜，雷霆与星光会在此交汇。',
        '碎骨码头': '位于荒原东南角的冰冷海岸上，是兽人唯一的海上据点。碎骨船长格洛克用巨大海兽骨骼搭建了这座粗犷的栈桥。他麾下那些由铁木与厚重兽皮打造的破冰战船，是唯一能在浮冰遍布的东北海域航行的巨舰。',

        '星耀树城': '屹立于林海东北部的生命之树冠盖之上，是精灵族梦幻般的空中王都。由散发着柔和光芒的星光藤蔓连接交织成浮空街道，美得令人窒息。游侠将军希尔瓦娜斯统领着银月卫队，警惕地守卫着高等精灵的纯粹血脉与森林的宁静。<br><br><span style="color:#d4af37; font-weight:bold;">◆ 星穹塔</span>：精灵预言魔法中心，大祭司艾拉瑞亚·星歌驻守。塔顶星光汇聚，预言符文流转，塔身由月光石砌成。<br><br><span style="color:#d4af37; font-weight:bold;">◆ 林海祭坛（十二祭坛之一）</span>：位于星耀树城深处的禁忌花园中。祭坛由一整块蕴含磅礴生命力的翡翠原石雕刻而成，它时刻维系着整个无尽林海的生态平衡。',
        '翠荫哨站': '位于星耀树城南方，隐蔽在几十米高的巨树枝桠间。哨官莱戈拉斯与他麾下最精锐的游侠隐匿于树冠之中，他们手中的附魔藤蔓长弓能够在入侵者踏入森林的瞬间，降下无声的绿色死亡之雨。',
        '远古树墓': '位于密林深处，树冠遮天蔽日，常年不见阳光。这里埋葬着上古之战中陨落的精灵英雄，空气中弥漫着淡淡的悲伤与腐朽的木香。守墓人树精<q><q>“朽木”</q></q>迈着沉重的步伐在墓碑间游荡，驱逐着一切企图惊扰英灵的盗墓贼。',
        '林海之门': '狮鹫崖正南方的宏伟关隘，由两颗活体战争古树交叉双臂构成。这里是裂隙平原通往精灵领地的唯一合法陆路入口。大德鲁伊玛法里奥的自然意志附着于此，若是心怀恶意的外敌强闯，古树便会苏醒化作无可匹敌的战争巨兽。',
        '鹿角村': '林海之门以南的宁静村落，村民多为半精灵与友善的林地生物。这里随处可见温顺的闪光角鹿在悠闲漫步。草药学大师半精灵莉莉娅在这里经营着一间小茅屋，她调配的自然秘药能解百毒。',
        '月溪镇': '位于鹿角村以东，因一条贯穿全镇的清澈荧光溪流而得名。神秘的旅行商人卡迪常在此出没，他的行囊里总是装满了外界难得一见的魔法种子与自然结晶。每当荧光溪水上涨，森林中的精怪便会聚集于此举行盛大的水上舞会。',
        '蛇人废墟': '月溪镇以东的神秘遗迹，曾是一个辉煌一时的冷血种族帝国。风化的石制金字塔内布满了致命的石化陷阱和毒气机关。传奇寻宝猎人伊泽瑞尔曾在此折戟，只留下了一本残破的探险日记警告着后人。',
        '银月村': '位于林海最东南的边境地带，常年笼罩在不散的月华结界中。这里是月神祭司的修行所，建筑通体散发着圣洁的银白色光辉。高阶女祭司泰兰德在月亮井旁倾听世人的忏悔，用圣洁的泉水洗刷他们灵魂的创伤。',
        '晨露村': '远古树墓以东，清晨时分的景色如同仙境。这里的树叶上凝结着蕴含高浓度魔力的晨露。酿酒大师陈·风暴烈酒不远万里来到这里，只为采集最纯粹的露水，酿造那传说中能让人忘却一切忧愁的<q><q>“神仙醉”</q></q>。',

        '铁炉堡': '位于铁峰山脉南部，矮人王国的地下要塞，熔炉永不熄灭。矮人国王布罗克·铁砧坐镇，要塞内大厅宽阔，石柱上刻满矮人历史浮雕。',
        '符文工坊': '坐落在平原西部海岸线上，俯瞰着下方紫色的深暗矿脉岛屿。巨大的齿轮轰鸣声和闪耀的符文光芒交织成一首工业赞歌。符文大师铜须终日抡动着他的天陨神锤，将最为狂暴的魔法元素强行敲打进冰冷的钢铁之中。',
        '灰谷营地': '符文工坊以东的流放者聚居地。这片处于灰暗山谷中的营地不受任何法律保护，帐篷与简易木屋杂乱无章地挤在一起。流亡贵族、通缉犯以及情报贩子<q><q>“独眼”</q></q>瓦里斯在此混杂，阴影中的每一场交易都伴随着背叛与杀戮。',

        '暗影城': '隐藏在西南方紫色深暗矿脉岛屿西北部的深渊洞穴中，是黑暗精灵令人战栗的地下母城。倒悬的漆黑堡垒和密布的魔法蛛网构成了这里的基调。主母薇拉在暗影塔顶端俯瞰着她的领地，用毒药和血腥的献祭维持着她绝对的统治。<br><br><span style="color:#d4af37; font-weight:bold;">◆ 暗影祭坛（十二祭坛之一）</span>：位于暗影城地下最深处的献祭大厅。祭坛上燃烧着能够吞噬光线的黯炎。这里曾是影魔大军突破位面的入口，如今被主母们用来举行残忍的血祭仪式，以换取深渊的短暂赐福。',
        '蛛网镇': '暗影城南方的险恶前哨站，整个小镇被挂在悬崖峭壁的巨型蛛网上。毒师黑寡妇在这里出售着全大陆最见血封喉的毒药，任何踏入小镇的外来者，都可能是黑暗精灵眼中待宰的猎物。',
        '幽暗哨站': '位于深暗矿脉岛屿的东北角，是一座几乎与紫色岩壁融为一体的隐形要塞。暗影之刃泰隆带领着他的刺客学徒把守于此，任何试图潜入这片紫色土地的入侵者，都会遭到无情的背刺。',
        '灰岩要塞': '盘踞在紫色岛屿中央偏东的位置，是灰矮人打造的地下钢铁壁垒。灰矮人暴君索瑞森端坐在黑铁王座上，指挥着不眠不休的岩石魔像巡逻队，任何试图染指地底矿脉的敌人都将被碾成肉泥。<br><br><span style="color:#d4af37; font-weight:bold;">◆ 灰岩祭坛（十二祭坛之一）</span>：被灰矮人用万吨符文铸铁强行镇压在要塞底部的古老祭坛。即便如此，每当地底魔脉震动，祭坛溢出的狂暴土元素依然会引发可怕的地底轰鸣。',
        '灵吸城': '位于灰岩要塞正南方的恐怖精神力场核心区域，是夺心魔的梦魇老巢。整个城市的建筑如同扭曲的脑组织，主脑的低语在每一个靠近此地的人脑海中回响，意志薄弱者会瞬间沦为没有灵魂的傀儡。<br><br><span style="color:#d4af37; font-weight:bold;">◆ 灵吸祭坛（十二祭坛之一）</span>：位于城池外围的悬浮祭坛。血月之纪时，这里被深渊邪能严重污染，导致了恐怖的精神力风暴，四周漂浮着无数因精神错乱而扭曲的灵体。',
        '荧光洞窟': '深暗矿脉岛屿最南端的奇异生态区。这里没有杀戮的喧嚣，只有无数发着幽蓝色光芒的巨型蘑菇和漂浮的荧光水母。盲眼地质学家布莱恩常年驻扎于此，记录着这些美丽而致命的地下奇观。',

        '旋涡城': '位于西部风暴海域的正中心，建于那吞噬一切的无尽大漩涡边缘。娜迦女王艾萨拉坐在由深海黑曜石和发光珊瑚铸造的王座上，傲视着翻滚的怒涛。她的歌声能平息风暴，也能唤醒沉睡在海渊深处的利维坦。',
        '沉船墓地': '旋涡城西南方的幽灵海域。数以千计的沉船残骸如同森林般竖立在昏暗的海底。幽灵船长戴维·琼斯驾驶着他那长满藤壶的战舰在此巡视，将一切鲜活的生命拖入冰冷的水底。',
        '深渊哨站': '位于大漩涡东侧的礁石群上。潮汐猎人利维坦率领着娜迦皇家卫队重兵把守于此。哨站内配备了能够召唤局部海啸的远古魔法阵，阻挡着陆地种族对海洋霸权的觊觎。',
        '风暴神殿': '位于深渊哨站正上方海域的孤岛之上。岛上终日雷霆炸裂，狂风肆虐。风暴召唤者萨尔站立在悬崖边缘，用他那宏亮的声音与雷霆共鸣，祈求风暴之主的护佑。<br><br><span style="color:#d4af37; font-weight:bold;">◆ 风暴祭坛（十二祭坛之一）</span>：神殿核心那座由陨星铁打造的祭坛。血月之纪时，深渊恶魔曾试图从旋涡底端逆流而上，被雷神之锤在此击碎，祭坛至今仍环绕着致命的连锁闪电。',
        '雷电神庙': '风暴海西北端边缘的远古遗迹。比风暴神殿更加古老且狂暴，几乎没有任何生命能在那种高频的雷击下存活。传说雷霆化身<q><q>“风暴之怒”</q></q>就沉睡在神庙深处，等待着风暴再次席卷大陆。',
        '海盗群岛': '南部珊瑚海西南侧的一大片混乱群岛。这里是公海上的<q><q>“三不管”</q></q>地带，骷髅旗迎风飘扬。海盗大帝普朗克用火炮和弯刀统治着这里，他豪迈的笑声伴随着朗姆酒的香气，在每一个充斥着劫掠与暴力的夜晚回荡。',
        '巨龟礁': '位于贝城正南方的海域，实际上是一只陷入沉睡的远古巨型海龟的背甲。长寿的老村长<q><q>“海泡”</q></q>带领着村民在龟背上安居乐业。每当巨龟缓慢游动，整座小镇便会在晨雾中开启一段全新的海上漂流。',
        '贝城': '珊瑚海北部的近岸水上都会，海精灵的温柔乡。一半建筑没入碧蓝的海水中，幻术编织者米拉用珍珠和粉色珊瑚打造了这座绝美的城市。这里的街道在阳光下熠熠生辉，宛如海神遗落人间的明珠。<br><br><span style="color:#d4af37; font-weight:bold;">◆ 深海祭坛（十二祭坛之一）</span>：隐没在贝城东南方极深的海沟底部。这里曾是净化海妖诅咒的核心枢纽，如今海精灵祭司们仍需在海潮汹涌之夜，潜入深渊举行净化仪式，以安抚躁动的深海怨灵。',
        '蝎狮洞': '贝城东侧海岸线的礁石洞穴网。因曾经盘踞着传说级魔物蝎狮而得名，如今已沦为刀头舔血的亡命徒的厮杀场。漆黑的洞穴内水陆交错，每一次潮汐的涨落都会冲刷掉昨日留下的血迹。',
        '海藻镇': '海盗群岛正北方的海上漂浮村落。药剂师穆尔克指导着村民世代打捞和养殖深海魔药海藻。虽然看似不起眼，但大陆上那些能够让人在水底自如呼吸的神神奇药剂，皆出自这个常年弥漫着海腥味的小镇。',

        '龙骨熔炉': '灰烬群岛主岛的正中心，一座建立在活火山之上的龙裔主城。这里的熔炉由地心岩浆直接供能，永不熄灭的火光将半边天空染成赤红。龙裔铸火者奥恩挥舞着巨锤，在龙裔议会的注视下，将真龙的鳞片锻打成斩裂天空的绝世神兵。',
        '龙息岛': '群岛最东南端的极端危险区域。整座岛屿就是一个随时可能喷发的火药桶，四处流淌着致命的岩浆河。龙语者伊格尼斯赤足走在滚烫的黑曜石上，聆听着火山口深处上古炎龙的呼吸。<br><br><span style="color:#d4af37; font-weight:bold;">◆ 火山祭坛（十二祭坛之一）</span>：高耸于龙息岛主火山口的黑曜石祭坛。血月之纪时，炎魔之王曾在此撕裂大地。祭坛周围的空气因极度高温而扭曲，岩浆的每一次翻滚都像是恶魔的心跳。',
        '燃烬镇': '群岛西北角的龙裔工匠聚集地。街道上流淌着滚烫的铁水，空气中弥漫着呛人的硫磺味与铁锤敲击的巨响。铁匠大师黑角光着膀子，将烧红的铁块浸入龙血之中，打造着能够抵御深渊腐蚀的重型铠甲。',
        '灰烬港': '群岛西部唯一的对外港口。港口总督德雷克站在用黑曜石砌成的巨大防波堤上，冷酷地审视着往来商船。装配着魔导重炮的龙首巨舰在港口内一字排开，任何试图在此撒野的海盗都会被瞬间轰成齑粉。',
        '孵化场': '群岛中央地带的绝对禁区。无数珍贵的龙蛋被安置在恒温的岩浆池畔。龙母阿莱克丝塔萨亲自盘踞于此，她那足以焚尽苍穹的怒火，是任何企图偷窃龙蛋的贪婪之徒的终极噩梦。',

        '冥河渡口': '位于仙魔大陆最西侧的登陆点。与主大陆的诅咒港遥相呼应，但这里弥漫的绝望气息更加浓烈。黑帆战舰穿梭于冥河般的黑水中，任何凡人之躯踏足这片土地，都会遭到深渊法则无情的精神压制。',
        '恶魔城': '诅咒港以东的深渊据点，一座仿佛由凝固的鲜血和骸骨铸就的绝望堡垒。这里的天空永远被暗红色的雷云笼罩，恶魔大君基尔加丹坐在高高的白骨王座上，无数曾试图讨伐他的联军勇士，最终都化为了城墙外哀嚎的枯骨。',
        '深渊之门': '深渊之门位于恶魔城东南方，是直通地狱核心的巨大空间裂隙。这里是仙人与恶魔的永恒绞肉机，源源不断涌出的高阶恶魔与誓死守护防线的仙人在此日夜厮杀，剑光与魔焰交织，鲜血早已将这片大地染成了化不开的暗红。冒险者若想关闭深渊之门，必须集结一支足以抗衡双方的军队。',
        '望仙渡': '仙魔大陆东部的祥瑞之港，与西部的恶魔城形成了鲜明对比。码头由温润的白玉雕琢而成，接引仙童白鹤提着琉璃宫灯，微笑着迎接那些历经千难万险、终于跨越重洋来到这片灵山秀水之地的求道者。',
        '白玉京': '望仙渡西北方悬浮于九天之上的修仙圣地。金霞万道，仙鹤齐鸣，亭台楼阁皆漂浮于云海之中，唯有跨越雷劫的尊者方能踏足。阁主太白真人常在此开炉炼丹，丹香飘满整个云端。',
        '剑庐': '白玉京东南方的一座孤傲剑峰。漫山遍野插满了残剑与名剑，空气中肆虐的剑气足以切开金石。孤傲的剑仙李太白于崖巅闭目静坐，唯有心性坚韧且天资卓绝之人，方能活着走到他面前，求得一式惊天动地的剑决。'
    };

    function getDynamicLocationData(locName) {
        var dynData = {
            hasData: false,
            desc: '一座普通的定居点。',
            camp: '未知',
            faction: '未知',
            economy: '一般',
            population: '一般',
            military: '一般',
            industry: '一般',
            security: '一般'
        };
        try {
            var sd = getMvuDataSafe();
            var bases = getVal(sd, '据点数据', null);

            if (bases) {
                // 1. 嗅探它是不是被转换成了数组结构
                if (Array.isArray(bases)) {
                    for (var i = 0; i < bases.length; i++) {
                        // 遍历数组里寻找有没有对应城市名字的键
                        if (bases[i] && bases[i][locName]) {
                            dynData.hasData = true;
                            dynData.desc = getVal(bases[i][locName], '据点描述', dynData.desc);
                            dynData.camp = getVal(bases[i][locName], '归属阵营', dynData.camp);
                            dynData.faction = getVal(bases[i][locName], '归属势力', dynData.faction);
                            dynData.economy = getVal(bases[i][locName], '经济', dynData.economy);
                            dynData.population = getVal(bases[i][locName], '人口', dynData.population);
                            dynData.military = getVal(bases[i][locName], '军事', dynData.military);
                            dynData.industry = getVal(bases[i][locName], '工业', dynData.industry);
                            dynData.security = getVal(bases[i][locName], '治安', dynData.security);
                            break;
                        }
                    }
                }
                // 2. 嗅探它是不是标准的字典对象
                else if (typeof bases === 'object') {
                    // 先尝试直接点名
                    if (bases[locName]) {
                        dynData.hasData = true;
                        dynData.desc = getVal(bases[locName], '据点描述', dynData.desc);
                        dynData.camp = getVal(bases[locName], '归属阵营', dynData.camp);
                        dynData.faction = getVal(bases[locName], '归属势力', dynData.faction);
                        dynData.economy = getVal(bases[locName], '经济', dynData.economy);
                        dynData.population = getVal(bases[locName], '人口', dynData.population);
                        dynData.military = getVal(bases[locName], '军事', dynData.military);
                        dynData.industry = getVal(bases[locName], '工业', dynData.industry);
                        dynData.security = getVal(bases[locName], '治安', dynData.security);
                    } else {
                        // 如果直接点名失败，有可能是因为 Proxy 拦截，强制遍历所有键试试
                        for (var key in bases) {
                            if (key === locName) {
                                dynData.hasData = true;
                                dynData.desc = getVal(bases[key], '据点描述', dynData.desc);
                                dynData.camp = getVal(bases[key], '归属阵营', dynData.camp);
                                dynData.faction = getVal(bases[key], '归属势力', dynData.faction);
                                dynData.economy = getVal(bases[key], '经济', dynData.economy);
                                dynData.population = getVal(bases[key], '人口', dynData.population);
                                dynData.military = getVal(bases[key], '军事', dynData.military);
                                dynData.industry = getVal(bases[key], '工业', dynData.industry);
                                dynData.security = getVal(bases[key], '治安', dynData.security);
                                break;
                            }
                        }
                    }
                }
            }
        } catch (e) {
            console.error("据点数据提取出错啦哥哥:", e);
        }
        return dynData;
    }

    var mapStyles = '' +
    '<style id="aelderan-map-css">' +
    '    #aelderan-map-drag-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 99999; cursor: grabbing; display: none; user-select: none; -webkit-user-select: none; }' +
    '    #aelderan-map-wrapper { position: fixed; left: 2vw; top: calc(30vh - 65px); z-index: 99997; font-family: <q>"Segoe UI"</q>, system-ui, sans-serif; user-select: none; }' +
    '    .aelderan-map-drag-handle { cursor: grab; touch-action: none; -webkit-touch-callout: none; -webkit-user-select: none; user-select: none; }' +
    '    .aelderan-map-drag-handle:active { cursor: grabbing; }' +
    '    #aelderan-map-btn-collapsed { box-sizing: border-box; width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #fffcf5 0%, #f3e5c8 100%); border: 2px solid #8b7355; box-shadow: 0 4px 12px rgba(0,0,0,0.2), inset 0 0 10px rgba(212, 175, 55, 0.3); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: transform 0.1s, box-shadow 0.1s; }' +
    '    #aelderan-map-btn-collapsed:active { transform: scale(0.92); box-shadow: 0 2px 6px rgba(0,0,0,0.2); }' +

    '    #aelderan-map-panel-expanded { width: 600px; max-width: 85vw; display: flex; flex-direction: column; background: #fefaf0; border: 2px solid #8b7355; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.25); overflow: hidden; transition: height 0.3s ease; }' +

    '    .map-wrapper-collapsed #aelderan-map-panel-expanded { display: none !important; }' +
    '    .map-wrapper-expanded #aelderan-map-btn-collapsed { display: none !important; }' +

    '    .map-header { flex-shrink: 0; height: 40px; min-height: 40px; background: linear-gradient(to right, #e5d7b3, #f5ecd8); border-bottom: 1px solid #8b7355; display: flex; justify-content: space-between; align-items: center; padding: 0 12px; color: #5d3a1a; cursor: grab; }' +
    '    .map-header:active { cursor: grabbing; }' +
    '    .map-header-title { font-size: 0.95rem; font-weight: bold; pointer-events: none; display: flex; align-items: center; gap: 6px;}' +
    '    .map-btn-fold { font-family: <q>"Segoe UI"</q>, system-ui, sans-serif !important; font-size: 0.8rem; color: #fffcf5; background: #8b7355; padding: 4px 12px; border-radius: 4px; font-weight: bold; border: none; cursor: pointer; transition: 0.2s; pointer-events: auto;}' +
    '    .map-btn-fold:hover { background: #5d3a1a; }' +
    '    .map-toolbar { flex-shrink: 0; background: #333; padding: 6px 12px; display: flex; gap: 8px; border-bottom: 1px solid #222; align-items: center;}' +
    '    .map-tool-btn { font-family: <q>"Segoe UI"</q>, system-ui, sans-serif !important; background: #555; color: #eee; border: 1px solid #666; padding: 2px 8px; border-radius: 4px; cursor: pointer; font-size: 0.8rem; transition: 0.2s;}' +
    '    .map-tool-btn:hover { background: #777; color: #fff; }' +
    '    .map-zoom-text { color: #aaa; font-size: 0.8rem; margin-left: auto; font-family: monospace;}' +

    '    .map-content-area { height: 33vh; min-height: 200px; max-height: 380px; flex-shrink: 0; overflow: auto; background: #2c2c2c; cursor: grab; touch-action: none; scrollbar-width: none; -ms-overflow-style: none; position: relative; border-bottom: 1px solid #8b7355; }' +
    '    .map-content-area:active { cursor: grabbing; }' +
    '    .map-content-area::-webkit-scrollbar { display: none; }' +

    '    #aelderan-map-img-container { position: relative; width: 100%; transition: width 0.1s ease-out; transform-origin: top left; display: block; pointer-events: none; }' +
    '    .world-map-img { width: 100%; height: auto; display: block; }' +

    '    /* 这里是扩大的隐形点击热区魔法哦 */' +
    '    .simple-red-dot { position: absolute; width: 8px; height: 8px; background-color: #ff3333; border: 1px solid white; border-radius: 50%; transform: translate(-50%, -50%); pointer-events: auto; cursor: pointer; box-shadow: 0 0 4px rgba(0,0,0,0.8); transition: transform 0.1s, background-color 0.2s; z-index: 5; }' +
    '    .simple-red-dot::before { content: <q>""</q>; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 30px; height: 30px; border-radius: 50%; background-color: transparent; z-index: 6; }' +
    '    .simple-red-dot:hover { background-color: #ffaa00; transform: translate(-50%, -50%) scale(1.3); z-index: 10; }' +
    '    .simple-map-label { position: absolute; top: 10px; left: 50%; transform: translateX(-50%); color: white; background: rgba(0,0,0,0.7); font-size: 13px; padding: 2px 5px; border-radius: 3px; white-space: nowrap; pointer-events: none; border: 1px solid rgba(212, 175, 55, 0.6); font-weight: bold; z-index: 11; }' +

    '    @keyframes aelderan-pulse { 0% { transform: scale(0.8); opacity: 1; } 100% { transform: scale(3.5); opacity: 0; } }' +
    '    .aelderan-player-marker { position: absolute; width: 12px; height: 12px; transform: translate(-50%, -50%); pointer-events: none; z-index: 20; }' +
    '    .player-marker-core { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: radial-gradient(circle, #ffe600 30%, #ffaa00 100%); border-radius: 50%; box-shadow: 0 0 8px #ffaa00, 0 0 12px #ffaa00; border: 1px solid #fff; }' +
    '    .player-marker-pulse { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-color: #ffe600; border-radius: 50%; animation: aelderan-pulse 1.5s infinite cubic-bezier(0.25, 0.8, 0.25, 1); }' +
    '    .player-marker-label { position: absolute; top: -20px; left: 50%; transform: translateX(-50%); color: #ffe600; font-size: 11px; font-weight: bold; text-shadow: 1px 1px 2px #000, -1px -1px 2px #000; white-space: nowrap; }' +
    '    .warning-banner { background: #5d1a1a; color: #ffcccc; padding: 4px 8px; font-size: 0.8rem; text-align: center; border-bottom: 1px solid #ff3333; display: none; }' +

    '    .map-info-container { flex-shrink: 0; background: #fefaf0; display: flex; flex-direction: column; transition: height 0.3s ease; overflow: hidden; }' +
    '    .info-panel-collapsed { height: 28px; }' +
    '    .info-panel-expanded { height: 220px; }' +
    '    .map-info-header { height: 28px; background: #e5d7b3; display: flex; justify-content: center; align-items: center; font-size: 0.85rem; font-weight: bold; color: #5d3a1a; cursor: pointer; border-top: 1px solid #d4af37; user-select: none; }' +
    '    .map-info-header:hover { background: #d4af37; color: #fff; }' +
    '    .map-info-content { flex-grow: 1; padding: 8px 12px; font-size: 0.85rem; color: #333; line-height: 1.5; display: flex; flex-direction: column; }' +
    '    .info-title { font-weight: bold; color: #8b7355; margin-bottom: 2px; font-size: 0.95rem; border-bottom: 1px dashed #d4af37; padding-bottom: 4px; flex-shrink: 0; }' +
    '    .dynamic-intel-box { background: rgba(139, 115, 85, 0.1); border-left: 3px solid #8b7355; padding: 6px 8px; border-radius: 0 4px 4px 0; font-size: 0.8rem; margin-top: 6px; }' +
    '    .dynamic-intel-box .inner-row { margin-top: 4px; color: #5d4a36; font-size: 0.8rem; }' +

    '    /* 新增细节面板样式 */' +
    '    details.map-tray-item { margin-top: 4px; background: #fffdf8; border: 1px solid rgba(229, 215, 179, 0.8); border-radius: 4px; overflow: hidden; transition: all 0.2s; }' +
    '    details.map-tray-item[open] { border-color: #d4af37; box-shadow: 0 2px 6px rgba(212, 175, 55, 0.15); }' +
    '    details.map-tray-item summary { padding: 4px 8px; cursor: pointer; font-size: 0.8rem; font-weight: 600; color: #5d3a1a; list-style: none; display: flex; justify-content: space-between; align-items: center; user-select: none; background: rgba(229, 215, 179, 0.2); }' +
    '    details.map-tray-item summary::-webkit-details-marker { display: none; }' +
    '    details.map-tray-item summary::after { content: "▼"; font-size: 0.6rem; opacity: 0.6; transition: transform 0.2s; pointer-events: none;} ' +
    '    details.map-tray-item[open] summary::after { transform: rotate(180deg); }' +
    '    .map-tray-content { padding: 6px 8px; font-size: 0.8rem; color: #3e2723; background: #fffcf5; line-height: 1.4; border-top: 1px dashed #e5d7b3; }' +

    '    .map-inner-tabs { display:flex; background:rgba(229,215,179,0.25); border-radius:4px; border:1px solid #dacba5; margin-top:8px; margin-bottom:6px; flex-shrink:0; }' +
    '    .map-tab-btn { font-family: <q>"Segoe UI"</q>, system-ui, sans-serif !important; text-align:center; padding:6px 0; font-size:0.8rem; font-weight:600; color:#8b7355; cursor:pointer; transition:0.2s; position:relative; display:flex; align-items:center; justify-content:center; gap:4px; flex: 1; }' +
    '    .map-tab-btn:not(:last-child)::after { content:<q>""</q>; position:absolute; right:0; top:20%; height:60%; width:1px; background:rgba(218, 203, 165, 0.5); }' +
    '    .map-tab-btn.active { background:#fffdf8; color:#b71c1c; }' +
    '    .map-tab-btn.active::before { content:<q>""</q>; position:absolute; left:15%; right:15%; bottom:0; height:2px; background:#b71c1c; border-radius:2px 2px 0 0; }' +

    '    .map-tab-content { display:none; animation: fadeIn 0.2s ease-in-out; flex-grow: 1; min-height: 0; }' +
    '    .map-tab-content.active { display:flex; flex-direction: column; }' +

    '    .map-scroll-area { flex-grow: 1; overflow-y: auto; padding-right: 4px; scrollbar-width: thin; scrollbar-color: #dacba5 transparent; border-bottom: 2px solid #d4af37; border-radius: 0 0 4px 4px; padding-bottom: 4px; height: 110px; }' +
    '    .map-scroll-area::-webkit-scrollbar { width: 4px; }' +
    '    .map-scroll-area::-webkit-scrollbar-thumb { background-color: #dacba5; border-radius: 4px; }' +

    '    .map-list-item { padding: 4px 6px; border-bottom: 1px dashed rgba(229, 215, 179, 0.5); font-size: 0.8rem; color: #5d3a1a; display: flex; align-items: center; gap: 6px;}' +
    '    .map-list-item:last-child { border-bottom: none; }' +
    '</style>';

    var mapTemplate = '' +
    '<div id="aelderan-map-drag-overlay"></div>' +
    '<div id="aelderan-map-wrapper" class="' + (mapState.isCollapsed ? 'map-wrapper-collapsed' : 'map-wrapper-expanded') + '">' +
    '    <div id="aelderan-map-btn-collapsed" class="aelderan-map-drag-handle" title="长按拖拽 / 点击展开地图">' +
            SvgIcon('twemoji:compass') +
    '    </div>' +
    '    <div id="aelderan-map-panel-expanded">' +
    '        <div class="map-header aelderan-map-drag-handle">' +
    '            <div class="map-header-title">' + SvgIcon('twemoji:world-map') + ' 艾尔德兰 大陆地图</div>' +
    '            <button class="map-btn-fold">收起</button>' +
    '        </div>' +
    '        <div class="warning-banner" id="map-warning-banner">⚠️ 空间感知受阻：当前处于未知界域</div>' +
    '        <div class="map-toolbar">' +
    '            <button class="map-tool-btn zoom-in">' + SvgIcon('twemoji:magnifying-glass-tilted-right', '1em') + ' 放大</button>' +
    '            <button class="map-tool-btn zoom-out">' + SvgIcon('twemoji:magnifying-glass-tilted-left', '1em') + ' 缩小</button>' +
    '            <button class="map-tool-btn zoom-reset">1:1 原尺寸</button>' +
    '            <span class="map-zoom-text" id="map-zoom-display">' + mapState.zoomLevel + '%</span>' +
    '        </div>' +
    '        <div class="map-content-area" id="aelderan-map-content-scroll">' +
    '            <div id="aelderan-map-img-container">' +
    '                <img class="world-map-img" src="https://i.postimg.cc/nzbXDmxd/1775647469434.png" alt="艾尔德兰地图" draggable="false">' +
    '            </div>' +
    '        </div>' +
    '        <div class="map-info-container info-panel-expanded" id="aelderan-map-info-box">' +
    '            <div class="map-info-header" id="info-toggle-btn" title="点击折叠/展开情报面板">' +
    '                <span>' + SvgIcon('twemoji:down-arrow') + ' 收起据点情报</span>' +
    '            </div>' +
    '            <div class="map-info-content" id="map-info-content-text">' +
    '                <div class="info-title">未选择据点</div>' +
    '                <div>请在地图上点击红色的据点标记以查看详细情报。</div>' +
    '            </div>' +
    '        </div>' +
    '    </div>' +
    '</div>';

    function initMapModule() {
        $('head').append(mapStyles);
        $('body').prepend(mapTemplate);

        var wrapper = $('#aelderan-map-wrapper');
        var overlay = $('#aelderan-map-drag-overlay');
        var mapImgContainer = wrapper.find('#aelderan-map-img-container');
        var zoomDisplay = wrapper.find('#map-zoom-display');
        var contentScroll = wrapper.find('#aelderan-map-content-scroll');
        var infoBox = wrapper.find('#aelderan-map-info-box');
        var infoToggleBtn = wrapper.find('#info-toggle-btn');
        var infoContentText = wrapper.find('#map-info-content-text');
        var warningBanner = wrapper.find('#map-warning-banner');

        if (!wrapper[0].style.right && !wrapper[0].style.left) {
            wrapper.css({ left: '2vw', top: 'calc(30vh - 65px)' });
        }

        var keys = Object.keys(locationCoords);
        for (var i = 0; i < keys.length; i++) {
            var name = keys[i];
            var coord = locationCoords[name];
            var dotHtml = '<div class="simple-red-dot" data-name="'+ name +'" data-x="'+ coord.x +'" data-y="'+ coord.y +'" title="'+ name +'" style="left: ' + coord.x + '%; top: ' + coord.y + '%;">' +
                          '<div class="simple-map-label">' + name + '</div>' +
                          '</div>';
            mapImgContainer.append(dotHtml);
        }

        var renderPlayerMarker = function() {
            $('#aelderan-player-marker').remove();
            warningBanner.hide();

            var pX = 0, pY = 0, pName = '未知地点';
            try {
                var sd = getMvuDataSafe();

                let heroData = null;
                if (sd && sd['主角面板'] && sd['主角面板'].HP) {
                    heroData = sd['主角面板'];
                } else if (sd) {
                    const searchHero = (obj) => {
                        if (!obj || typeof obj !== 'object' || heroData) return;
                        if (obj.HP !== undefined && obj['当前位置']) {
                            heroData = obj;
                            return;
                        }
                        for (let key in obj) { if (!heroData && typeof obj[key] === 'object') searchHero(obj[key]); }
                    };
                    searchHero(sd);
                }

                if (heroData) {
                    let curLocObj = getVal(heroData, '当前位置', {});
                    pX = parseFloat(getVal(curLocObj, '大区域.坐标.x', 0)) || 0;
                    pY = parseFloat(getVal(curLocObj, '大区域.坐标.y', 0)) || 0;
                    pName = getVal(curLocObj, '大区域.名称', '未知区域');
                } else if (sd && sd['当前位置']) {
                    pX = parseFloat(getVal(sd, '当前位置.大区域.坐标.x', 0)) || 0;
                    pY = parseFloat(getVal(sd, '当前位置.大区域.坐标.y', 0)) || 0;
                }
            } catch(e) {}

            if (pX > 0 && pY > 0) {
                var markerHtml = '<div id="aelderan-player-marker" class="aelderan-player-marker" style="left: ' + pX + '%; top: ' + pY + '%;">' +
                                 '<div class="player-marker-pulse"></div>' +
                                 '<div class="player-marker-core"></div>' +
                                 '<div class="player-marker-label">📍 当前位置</div>' +
                                 '</div>';
                mapImgContainer.append(markerHtml);
            } else {
                warningBanner.show();
            }
        };

        var updateZoom = function() {
            mapState.zoomLevel = Math.max(20, Math.min(mapState.zoomLevel, 500));
            mapImgContainer.css('width', mapState.zoomLevel + '%');
            zoomDisplay.text(mapState.zoomLevel + '%');
        };

        updateZoom();
        renderPlayerMarker();

        var markerTimer = setInterval(function() {
            if (!mapState.isCollapsed) renderPlayerMarker();
        }, 2000);

        var toggleMapCollapse = function(e) {
            if (wrapper.data('isDragging')) return;
            if(e && e.stopPropagation) e.stopPropagation();
            mapState.isCollapsed = !mapState.isCollapsed;
            localStorage.setItem(MAP_CONFIG.storageCollapse, mapState.isCollapsed ? 'true' : 'false');

            if(mapState.isCollapsed) {
                wrapper.removeClass('map-wrapper-expanded').addClass('map-wrapper-collapsed');
            } else {
                wrapper.removeClass('map-wrapper-collapsed').addClass('map-wrapper-expanded');
                renderPlayerMarker();
            }
        };

        infoToggleBtn.on('click.aelderanmap', function(e) {
            e.stopPropagation();
            mapState.infoPanelOpen = !mapState.infoPanelOpen;
            if (mapState.infoPanelOpen) {
                infoBox.removeClass('info-panel-collapsed').addClass('info-panel-expanded');
                infoToggleBtn.html('<span>' + SvgIcon('twemoji:down-arrow') + ' 收起据点情报</span>');
            } else {
                infoBox.removeClass('info-panel-expanded').addClass('info-panel-collapsed');
                infoToggleBtn.html('<span>' + SvgIcon('twemoji:scroll') + ' 展开据点情报</span>');
            }
        });

        var mapIsDragging = false, mapHasMoved = false, mapStartX, mapStartY, scrollLeftStart, scrollTopStart;

        contentScroll.on('mousedown.aelderanmap touchstart.aelderanmap', function(e) {
            mapIsDragging = true; mapHasMoved = false;
            var evt = e.type.indexOf('touch') !== -1 ? e.originalEvent.touches[0] : e;
            mapStartX = evt.pageX; mapStartY = evt.pageY;
            scrollLeftStart = contentScroll.scrollLeft(); scrollTopStart = contentScroll.scrollTop();

            if (!($(e.target).hasClass('simple-red-dot') || $(e.target).closest('.simple-red-dot').length)) {
                if(e.type === 'mousedown') e.preventDefault();
            }
        });

        contentScroll.on('mousemove.aelderanmap touchmove.aelderanmap', function(e) {
            if (!mapIsDragging) return;
            var evt = e.type.indexOf('touch') !== -1 ? e.originalEvent.touches[0] : e;
            var walkX = evt.pageX - mapStartX; var walkY = evt.pageY - mapStartY;
            if (Math.abs(walkX) > 2 || Math.abs(walkY) > 2) mapHasMoved = true;
            contentScroll.scrollLeft(scrollLeftStart - walkX); contentScroll.scrollTop(scrollTopStart - walkY);
            e.stopPropagation(); if(e.type === 'touchmove') e.preventDefault();
        });

        contentScroll.on('mouseup.aelderanmap mouseleave.aelderanmap touchend.aelderanmap', function(e) {
            if (mapIsDragging) { mapIsDragging = false; e.stopPropagation(); }
        });

        wrapper.on('click.aelderanmap', '.simple-red-dot', function(e) {
            e.stopPropagation();
            if (mapHasMoved) { mapHasMoved = false; return; }

            var locName = $(this).attr('data-name');
            var locX = $(this).attr('data-x');
            var locY = $(this).attr('data-y');
            var locXNum = parseFloat(locX);
            var locYNum = parseFloat(locY);

            var staticDesc = locationInfoData[locName] || '关于这里的详细历史记录尚在收集中...';
            staticDesc = staticDesc.replace(/\n/g, '<br>');

            var dynData = getDynamicLocationData(locName);
            var dynamicHtml = '';

            if (dynData.hasData) {
                dynamicHtml = '<div class="dynamic-intel-box">' +
                              '<div style="font-size:0.85rem; margin-bottom:6px; color:#3e2723; line-height:1.4;">' + dynData.desc + '</div>' +
                              '<div class="inner-row">' + SvgIcon('twemoji:triangular-flag') + ' <b>归属：</b><span style="font-weight:bold; color:#5d3a1a;">' + dynData.faction + '</span> <span style="font-size:0.75rem; color:#8b7355;">(' + dynData.camp + ')</span></div>' +
                              '<div style="margin-top: 6px;">' +
                                  '<details class="map-tray-item">' +
                                      '<summary><span style="color:#2b6cb0; display:flex; align-items:center; gap:4px;">' + SvgIcon('twemoji:busts-in-silhouette') + ' 人口规模</span></summary>' +
                                      '<div class="map-tray-content">' + dynData.population + '</div>' +
                                  '</details>' +
                                  '<details class="map-tray-item">' +
                                      '<summary><span style="color:#b8860b; display:flex; align-items:center; gap:4px;">' + SvgIcon('twemoji:coin') + ' 经济状况</span></summary>' +
                                      '<div class="map-tray-content">' + dynData.economy + '</div>' +
                                  '</details>' +
                                  '<details class="map-tray-item">' +
                                      '<summary><span style="color:#b71c1c; display:flex; align-items:center; gap:4px;">' + SvgIcon('twemoji:crossed-swords') + ' 军事概况</span></summary>' +
                                      '<div class="map-tray-content">' + dynData.military + '</div>' +
                                  '</details>' +
                                  '<details class="map-tray-item">' +
                                      '<summary><span style="color:#2e7d32; display:flex; align-items:center; gap:4px;">' + SvgIcon('twemoji:shield') + ' 治安环境</span></summary>' +
                                      '<div class="map-tray-content">' + dynData.security + '</div>' +
                                  '</details>' +
                                  '<details class="map-tray-item">' +
                                      '<summary><span style="color:#6d4c41; display:flex; align-items:center; gap:4px;">' + SvgIcon('twemoji:hammer-and-wrench') + ' 工业能力</span></summary>' +
                                      '<div class="map-tray-content">' + dynData.industry + '</div>' +
                                  '</details>' +
                              '</div>' +
                              '</div>';
            } else {
                dynamicHtml = '<div class="dynamic-intel-box" style="color: #888; text-align: center; margin-top: 20px;">' +
                              '⚠️ 尚无该据点的实时军情数据，需DM探明。' +
                              '</div>';
            }

            var sd = getMvuDataSafe();
            var npcList = [], playerList = [], bioList = [];

            var npcData = getVal(sd, 'NPC档案', {});
            if (typeof npcData === 'object' && npcData !== null) {
                for (var nName in npcData) {
                    var nLoc = getVal(npcData[nName], '当前位置.大区域.坐标', {});
                    if (parseFloat(nLoc.x) === locXNum && parseFloat(nLoc.y) === locYNum) {
                        var nRace = getVal(npcData[nName], '种族', '未知');
                        npcList.push('<div class="map-list-item">' + getAvatarIcon(nRace) + ' <span>' + nName + '</span></div>');
                    }
                }
            }
            var npcHtml = npcList.length > 0 ? npcList.join('') : '<div style="text-align:center; color:#8b7355; margin-top:20px; font-size:0.8rem;">空无一人</div>';

            var playerData = getVal(sd, '异人玩家', {});
            if (typeof playerData === 'object' && playerData !== null) {
                for (var pName in playerData) {
                    var pLoc = getVal(playerData[pName], '当前位置.大区域.坐标', {});
                    if (parseFloat(pLoc.x) === locXNum && parseFloat(pLoc.y) === locYNum) {
                        var pRace = getVal(playerData[pName], '种族', '未知');
                        playerList.push('<div class="map-list-item">' + getAvatarIcon(pRace) + ' <span style="color:#0d47a1; font-weight:bold;">[' + pName + ']</span></div>');
                    }
                }
            }
            var playerHtml = playerList.length > 0 ? playerList.join('') : '<div style="text-align:center; color:#8b7355; margin-top:20px; font-size:0.8rem;">无异人踪迹</div>';

            var bioData = getVal(sd, '生物', {});
            if (typeof bioData === 'object' && bioData !== null) {
                for (var bName in bioData) {
                    var bLoc = getVal(bioData[bName], '当前位置.大区域.坐标', {});
                    if (parseFloat(bLoc.x) === locXNum && parseFloat(bLoc.y) === locYNum) {
                        var bSpecies = getVal(bioData[bName], '物种', '未知');
                        bioList.push('<div class="map-list-item">' + getAvatarIcon(bSpecies) + ' <span style="color:#2e7d32; font-weight:bold;">[' + bName + ']</span></div>');
                    }
                }
            }
            var bioHtml = bioList.length > 0 ? bioList.join('') : '<div style="text-align:center; color:#8b7355; margin-top:20px; font-size:0.8rem;">无生物踪迹</div>';

            var tabHtml = '' +
            '<div class="map-inner-tabs">' +
            '    <div class="map-tab-btn active" data-target="m-tab-intel">' + SvgIcon('twemoji:scroll') + ' 据点背景</div>' +
            '    <div class="map-tab-btn" data-target="m-tab-sub">' + SvgIcon('twemoji:pushpin') + ' 据点情报</div>' +
            '    <div class="map-tab-btn" data-target="m-tab-npc">' + SvgIcon('twemoji:house') + ' NPC</div>' +
            '    <div class="map-tab-btn" data-target="m-tab-player">' + SvgIcon('twemoji:crossed-swords') + ' 玩家</div>' +
            '    <div class="map-tab-btn" data-target="m-tab-bio">' + SvgIcon('twemoji:wolf') + ' 生物</div>' +
            '</div>' +
            '<div class="map-tab-content active" id="m-tab-intel">' +
            '    <div class="map-scroll-area" style="padding-top:4px;">' +
            '        <div>' + staticDesc + '</div>' +
            '    </div>' +
            '</div>' +
            '<div class="map-tab-content" id="m-tab-sub">' +
            '    <div class="map-scroll-area" style="padding-top:4px;">' + dynamicHtml + '</div>' +
            '</div>' +
            '<div class="map-tab-content" id="m-tab-npc">' +
            '    <div class="map-scroll-area">' + npcHtml + '</div>' +
            '</div>' +
            '<div class="map-tab-content" id="m-tab-player">' +
            '    <div class="map-scroll-area">' + playerHtml + '</div>' +
            '</div>' +
            '<div class="map-tab-content" id="m-tab-bio">' +
            '    <div class="map-scroll-area">' + bioHtml + '</div>' +
            '</div>';

            infoContentText.html(
                '<div class="info-title">' + locName + ' <span style="font-size:0.75rem; color:#aaa; font-weight:normal;">(x:' + locX + ', y:' + locY + ')</span></div>' +
                tabHtml
            );

            if (!mapState.infoPanelOpen) {
                infoToggleBtn.trigger('click.aelderanmap');
            }
        });

        wrapper.on('click.aelderanmap', 'details.map-tray-item summary', function(e) {
            e.stopPropagation();
        });

        wrapper.on('click.aelderanmap', '.map-tab-btn', function(e) {
            e.stopPropagation();
            var target = $(this).attr('data-target');
            $(this).siblings().removeClass('active');
            $(this).addClass('active');
            $(this).parent().siblings('.map-tab-content').removeClass('active');
            $(this).parent().siblings('#' + target).addClass('active');
        });

        wrapper.on('mousedown.aelderanmap touchstart.aelderanmap', '.map-scroll-area', function(e) {
            e.stopPropagation();
        });

        wrapper.on('click.aelderanmap', '.zoom-in', function(e) { e.stopPropagation(); mapState.zoomLevel += 20; updateZoom(); });
        wrapper.on('click.aelderanmap', '.zoom-out', function(e) { e.stopPropagation(); mapState.zoomLevel -= 20; updateZoom(); });
        wrapper.on('click.aelderanmap', '.zoom-reset', function(e) { e.stopPropagation(); mapState.zoomLevel = 100; updateZoom(); });

        wrapper.on('wheel.aelderanmap', '.map-content-area', function(e) {
            if (e.ctrlKey || !e.shiftKey) {
                e.preventDefault(); e.stopPropagation();
                var delta = e.originalEvent.deltaY;
                if (delta < 0) mapState.zoomLevel += 10;
                else mapState.zoomLevel -= 10;
                updateZoom();
            }
        });

        var dragStartX, dragStartY, initialLeft, initialTop, dragStartTarget = null;
        wrapper.on('mousedown.aelderanmap touchstart.aelderanmap', '.aelderan-map-drag-handle, .map-btn-fold', function(e) {
            if ($(e.target).hasClass('map-btn-fold')) { toggleMapCollapse(e); return; }
            wrapper.data('isDragging', false);
            var evt = e.type.indexOf('touch') !== -1 ? e.originalEvent.touches[0] : e;
            dragStartX = evt.clientX; dragStartY = evt.clientY; dragStartTarget = e.target;
            var rect = wrapper[0].getBoundingClientRect();
            initialLeft = rect.left; initialTop = rect.top;
            overlay.show(); if(e.type === 'mousedown') e.preventDefault();
        });

        overlay.on('mousemove.aelderanmap touchmove.aelderanmap', function(e) {
            var moveEvt = e.type.indexOf('touch') !== -1 ? e.originalEvent.touches[0] : e;
            var deltaX = moveEvt.clientX - dragStartX, deltaY = moveEvt.clientY - dragStartY;
            if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
                wrapper.data('isDragging', true);
                wrapper.css({ left: (initialLeft + deltaX) + 'px', top: (initialTop + deltaY) + 'px', right: 'auto', bottom: 'auto' });
            }
            if(e.type === 'touchmove') e.preventDefault();
        });

        overlay.on('mouseup.aelderanmap touchend.aelderanmap', function(e) {
            overlay.hide();
            if (wrapper.data('isDragging')) setTimeout(function() { wrapper.data('isDragging', false); }, 50);
            else if (dragStartTarget && ($(dragStartTarget).closest('#aelderan-map-btn-collapsed').length || $(dragStartTarget).closest('.map-header').length)) toggleMapCollapse(e);
            dragStartTarget = null;
        });

        wrapper.data('markerTimer', markerTimer);
    }

    var checkJQuery = setInterval(function() {
        if (window.jQuery) { clearInterval(checkJQuery); initMapModule(); }
    }, 200);

    $(window).on('unload.aelderanmap', function() {
        var oldTimer = $('#aelderan-map-wrapper').data('markerTimer');
        if (oldTimer) clearInterval(oldTimer);
        $('#aelderan-map-wrapper, #aelderan-map-css, #aelderan-map-drag-overlay').remove();
        $(document).off('.aelderanmap');
    });

})();
