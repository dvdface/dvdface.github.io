# 示例

#### 测试依据

系统应该接受18~80岁\(年龄基于用户的输入\)的保险申请；年龄若不满足要求，就应该拒绝申请；如果年龄大于70岁，那么就应该提示用户，它们需要支持$1000的额外费用；

#### 测试出口准则

测试出口准则为100%的等价类划分覆盖；且所有测试用例必须为Pass；

#### 测试规格

根据出口准则，测试规格为根据所描述系统行为的等价类划分；

首先对输出进行等价类划分：

* TCOND-1. 18 ≤ Age ≤ 80
* TCOND-2. Age &lt; 18
* TCOND-3. Age&gt; 80

还有一个是隐含的无效输入，把无效输入分为两个等价类：

* TCOND-4. Age = alphabetic
* TCOND-5. Age = special character

考虑到输出，分为如下等价类：

* TCOND-6. Accept \(is induced by 18  Age  80\)
* TCOND-7. Reject \(is induced by \(Age &lt; 18\) OR \(Age &gt; 80\)\)
* TCOND-8. Excess warning \(is induced by 70  Age  80\)

无效的等价类对应的输出则以上皆非的输出；

假设还存在一个折扣的测试规格：

* TCOND-9. Discount message \(is induced by 40  Age  55\)

#### 测试覆盖项

使用等价类对测试规格进行覆盖：

* TCI-1. 18  Age  80 \(covers TCOND-1/TCOND-6\) 
* TCI-2. Age&lt; 18 \(covers TCOND-2/TCOND-7\) 
* TCI-3. Age &gt; 80 \(covers TCOND-3/TCOND-7\)
* TCI-4. Age = w \(covers TCOND-4\)
* TCI-5. Age = & \(covers TCOND-5\)
* TCI-6. 70  Age  80 \(covers TCOND-8\)
* TCI-7. 40  Age  55 \(covers TCOND-9\)

#### 测试用例

创建如下用例对以上测试覆盖项进行覆盖：

* CASE\#1. Input: ‘Age =53’ Expected Result: ‘Accept’. \(exercises TCI-1 & TCI-7\)
* CASE\#2. Input: ‘Age = 15’ Expected Result: ‘Reject’. \(exercises TCI-2\)
* CASE\#3. Input: ‘Age = 89’ Expected Result: ‘Reject’. \(exercises TCI-3\)
* CASE\#4. Input: ‘Age = w’ Expected Result: ‘Reject’. \(exercises TCI-4\)
* CASE\#5. Input: ‘Age =&’ Expected Result: ‘Reject’. \(exercises TCI-5\)
* CASE\#6. Input: ‘Age =77’ Expected Result: ‘Accept+Warn’. \(exercises TCI-6 & TCI-1\)

#### 测试集

把以上测试用例分为两个测试集合：

* TS1: CASES \# 4 and 5 - manual testing. 
* TS2: CASES \# 1, 2, 3, and 6 - automated testing.



