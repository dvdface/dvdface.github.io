---
description: Failure Mode and Effects Analysis)
---

# 失效模式与影响分析\(FMEA\)

## 什么是FMEA

FMEA要早于FTA， 它出现于《Procedure for performing a failure mode effect and criticality analysis, November 9, 1949, United States Military Procedure, MIL-P-1629》；

FMEA的最初的目标是识别对任务的成功和个人与装备安全有重大影响故障；即，在灾难性的故障发生之前，对之进行识别，和预防；

FMEA一般由相关专家在产品开发的早期阶段对产品的设计与制造过程进行彻底的分析；它的目标是在产品交付到用户手中之前，找出和纠正产品的所有缺陷；

如果把FMEA当作在开发过程中填写一堆Checklist表，然后就束之高阁，那么FMEA仅仅是浪费大家的时间，没有任何鸟用；如果，在产品生命周期中，至始至终的应用FMEA方法，那么将会对产品稳定性、可靠性、质量、交付和成本有莫大的助力；

## FMEA的目标

FTA的目标定义如下：

* 识别和全面的理解可能的_**失效模式**_，_**根因**_和它们对系统、终端用户的_**影响**_；
* 使用识别得到的失效模式、影响和根因，评估风险，_**制订行动计划和优先级**_；
* 识别和实现正确的行动，_**解决**_当中最突出的一些故障；

## FMEA的相关标准

关于FMEA有很多现存的标准和指引，主要对FMEA的范围和过程进行了规定：

* SAE J1739, Potential Failure Mode and Effects Analysis in Design \(Design FMEA\), Potential Failure  Mode and Effects Analysis in Manufacturing and Assembly Processes \(Process FMEA\) \[2009\]
* AIAG, Potential Failure Mode and Effects Analysis \(FMEA\) Reference Manual Fourth Edition \[2008\]
* MIL-STD-1629A, Procedures for Performing a Failure Mode Effects and Criticality Analysis \(Cited for cancelation in 1994, but still used in some military and other applications\)
* SAE ARP5580, Recommended Failure Modes and Effects Analysis \(FMEA\) Practices for Non-Automobile Applications \[2001\]
* IEC 60812, Analysis techniques for system reliability – Procedure for failure mode and effects analysis \(FMEA\) \[2006\]

## **适用FMEA的项目**

FMEA费时费力，并不是所有的项目都需要进行FMEA活动；  
一般如下项目需要进行FMEA活动：

* New technology，新技术
* New designs where risk is a concern，风险大的新设计
* New applications of existing technology，现有技术新的应用方式
* Potential for safety issues，有潜在的安全问题
* History of significant field problems，历史上存在重大的问题
* Potential for important regulation issues，涉及重大的法律法规
* Mission Critical applications，关键性的应用、任务
* Supplier Capability，供应能力

## FMEA类型

![&#x4EA7;&#x54C1;&#x7684;&#x4E0D;&#x540C;&#x9636;&#x6BB5;&#x5E94;&#x7528;FMEA](../../.gitbook/assets/image%20%2812%29.png)

FMEA分为很多种类型，有：

* **System FMEA** 系统级的FMEA，主要针对整个系统； 主要专注于系统内部子系统之间的交互和接口，以及系统与外部系统\(环境、人、系统）之间的可能会导致整个系统故障的交互；
* **Design FMEA** 子系统、组件级的FMEA，主要是针对产品设计； 主要专注子系统和组件，关注子系统和组件内部，以及与其他子系统之间的接口和交互等；
* **Process FMEA** 专注于制造和组装过程； 主要是确保制造过程符合设计需求；

## FMEA分析方法

![FMEA&#x5206;&#x6790;&#x6D41;&#x7A0B;](../../.gitbook/assets/image%20%2817%29.png)

![&#x5178;&#x578B;&#x7684;FMEA&#x5206;&#x6790;&#x8868;&#x5355;](../../.gitbook/assets/image%20%2818%29.png)

1. **Item** Item，被分析对象； ****对于System FMEA来说，就是整个系统； 对于Desgin FMEA来说，是子系统或组件； 对于Process FMEA来说， 是待分析的生产或者组装步骤
2. **Function** item的功能，用途；有时候需要带上该Item的性能标准； ****对于Design FMEA来说， 即，Item的设计目的或目标； 对于Process FMEA来说，即，制造或组装操作的目的；
3. **Potential Failure Mode** 失效模式是item或者操作可能无法满足其设计目标时的故障方式；
4. **Potential Effect\(s\) of Failure** 产生失效之后导致的后果、影响； 一般多个层次描述，一个从设计目标、装配目标失效的角度描述；一个对上层模块的描述；最后，从对最终用户的影响描述；
5. **SEV\(Severity\)** 严重程度； 严重程度一般分5类10级，分别是： 1）主要功能不可用， 分两级，分别是突然对安全操作影响的无任何警告的失效 和 待警告的失效； 2）主要功能无法完全满足要求，分两级，分别是主要功能丧失 和 主要功能的退化； 3）次要功能不可用，分两级，分别是次要功能丧失 和 次要功能的退化； 4）可用但是对用户产生感知的负面影响，分三级，分别是影响75%， 50%和25%用户； 5）无任何影响，分一级，即用户无任何感知；
6. **Potential Cause\(s\) of Failure** 失效的根因
7. **OCC\(Occurency\)** 发生的频率，一般分为5挡10级； 分别为：          极高概率：&gt;10%,  &gt;5%         高概率：&gt;2%，&gt;1%         中等概率：&gt;0.5%，&gt;0.2%，&gt;0.1%         低概率：&gt;0.5‰，&gt;0.1‰         极低概率：&gt;0.01‰
8. **Current Design Controls\(Prevention & Detection\)** 设计上的控制手段有两种方法，一种是预防，一种是检测； 预防手段主要是用来减少故障发生的可能性； 检测手段主要是检测故障和缺陷的发生； 仅当计划中的或者正在实施的才需要放入到FMEA表中；
9. **DET\(Detection\)**  
   根据步骤8中采取的措施，可用评估得到一个故障被检测出来的可能性  
   用这个可检测的可能性对故障可被检测出来的等级进行评估；  
   检出可能性一样分为五挡10级：  
           无法检测到：  
                      10级，无法检测出来；  
           在任何阶段不大可能被检测到：  
                     9级，很弱的检测能力，很难被检测到；  
           设计冻结/操作/装配后启动前可检测到：  
                     8级，设计或操作完成之后，通过功能测试可以检测出来

                                                                        或者装配完成后的检查工序可以检查出来；

                     7级，设计或操作完成之后，通过稳定性测试可以检测出来  
                                                                        或者装配完成后的本工序检查可以检查出来；  
                     6级，设计或操作完成之后，通过老化测试可以检测出来  
                                                                         或者装配完成后的可变计量可以检查出来；  
           设计冻结/操作/装配前可检测到：  
                     5级，设计或操作完成之前，通过功能测试可以检测出来  
                                                                       或者装配完成后的检查工序可以检查出来；  
                     4级，设计或操作完成之前，通过稳定性测试可以检测出来

                                                                       或者装配完成后的本工序检查可以检查出来；  
                     3级，设计或操作完成之前，通过老化测试可以检测出来  
                                                                       或者装配完成后的可变计量可以检查出来；  
           可视分析：  
                     2级，在设计冻结或者操作装配之前即可检测到  
           完全预防：  
                    1级，缺陷已经被完全预防住了

10. **RPN\(Risk Priority Number）** 风险等级数 = 故障的严重程度 x  根因发生的可能性 x 检测到根因的可能性 这个数字比较主观，并不连续，存在很多不同严重等级发生概率但是数值却相同的情况； 使用时，不要用什么RPN的区间值来区分问题的严重性，而是根据值大值小的看，大就严重； 使用时可以定义每个等级的最小值，分成多个等级，如5等；
11. **Recommended Action\(s\)** 建议的应对措施

## **附录：**

**1）Severity划分**

![Design FMEA&#x7684;&#x4E25;&#x91CD;&#x7EA7;&#x522B;&#x5212;&#x5206;](../../.gitbook/assets/image%20%2819%29.png)

![Process FMEA&#x7684;&#x4E25;&#x91CD;&#x7B49;&#x7EA7;&#x5212;&#x5206;](../../.gitbook/assets/image%20%2870%29.png)

**2）发生概率划分**

![Design FMEA&#x53D1;&#x751F;&#x6982;&#x7387;&#x5B9A;&#x4E49;](../../.gitbook/assets/image%20%2871%29.png)

![Process FMEA&#x53D1;&#x751F;&#x6982;&#x7387;&#x5B9A;&#x4E49;](../../.gitbook/assets/image%20%2857%29.png)

**3\) 被检出的可能性**

![Desgin FMEA&#x4E2D;&#x68C0;&#x51FA;&#x53EF;&#x80FD;&#x6027;&#x7684;&#x5B9A;&#x4E49;](../../.gitbook/assets/image%20%2863%29.png)

![Process FMEA&#x4E2D;&#x68C0;&#x51FA;&#x53EF;&#x80FD;&#x6027;&#x7684;&#x5B9A;&#x4E49;](../../.gitbook/assets/image%20%2815%29.png)

