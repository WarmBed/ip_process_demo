"""
IP Winner Pitch GIF Generator
Creates 3 animated GIFs for investor/client demos
"""

from PIL import Image, ImageDraw, ImageFont
import os

# ── Config ──────────────────────────────────────────
W, H = 1200, 720
BG = (17, 17, 20)           # dark bg
CARD_BG = (28, 28, 32)
BORDER = (45, 45, 50)
WHITE = (255, 255, 255)
GRAY = (140, 140, 150)
LIGHT = (200, 200, 210)
GREEN = (34, 197, 94)
GREEN_BG = (34, 197, 94, 40)
BLUE = (59, 130, 246)
BLUE_BG = (30, 40, 70)
ORANGE = (249, 115, 22)
ORANGE_BG = (60, 35, 15)
RED = (239, 68, 68)
RED_BG = (60, 20, 20)
INDIGO = (99, 102, 241)
INDIGO_BG = (35, 30, 70)
YELLOW = (250, 204, 21)
ACCENT = (99, 102, 241)     # indigo accent

OUT_DIR = os.path.dirname(os.path.abspath(__file__))
FRAME_DURATION = 120  # ms per frame

# ── Font helpers ────────────────────────────────────
def get_font(size):
    paths = [
        "C:/Windows/Fonts/msjh.ttc",      # Microsoft JhengHei
        "C:/Windows/Fonts/msyh.ttc",       # Microsoft YaHei
        "C:/Windows/Fonts/segoeui.ttf",
        "C:/Windows/Fonts/arial.ttf",
    ]
    for p in paths:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except:
                continue
    return ImageFont.load_default()

FONT_L = get_font(28)
FONT_M = get_font(20)
FONT_S = get_font(16)
FONT_XS = get_font(13)
FONT_XL = get_font(36)
FONT_TITLE = get_font(32)

# ── Drawing helpers ─────────────────────────────────
def rounded_rect(draw, xy, fill, radius=12, outline=None):
    x0, y0, x1, y1 = xy
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline)

def draw_header(draw, title, subtitle=""):
    # Top bar
    rounded_rect(draw, (0, 0, W, 56), fill=(22, 22, 26))
    draw.text((24, 14), "IP Winner", font=FONT_M, fill=ACCENT)
    draw.text((160, 16), title, font=FONT_S, fill=GRAY)
    # Dot indicators
    for i, c in enumerate([(GREEN), (ORANGE), (BLUE)]):
        draw.ellipse((W-100+i*20, 22, W-88+i*20, 34), fill=c)

def draw_card(draw, x, y, w, h, fill=CARD_BG):
    rounded_rect(draw, (x, y, x+w, y+h), fill=fill, outline=BORDER)

def draw_tag(draw, x, y, text, color, bg_color):
    tw = len(text) * 10 + 16
    rounded_rect(draw, (x, y, x+tw, y+26), fill=bg_color, radius=6)
    draw.text((x+8, y+4), text, font=FONT_XS, fill=color)
    return tw

def draw_progress_bar(draw, x, y, w, progress, color=GREEN):
    # bg
    rounded_rect(draw, (x, y, x+w, y+8), fill=(50, 50, 55), radius=4)
    # fill
    if progress > 0:
        pw = max(8, int(w * progress))
        rounded_rect(draw, (x, y, x+pw, y+8), fill=color, radius=4)

def draw_check(draw, x, y, done=True):
    if done:
        draw.ellipse((x, y, x+22, y+22), fill=GREEN)
        draw.text((x+4, y+1), "✓", font=FONT_XS, fill=WHITE)
    else:
        draw.ellipse((x, y, x+22, y+22), outline=GRAY)

def draw_email_row(draw, x, y, sender, subject, code, status_text, status_color, highlight=False):
    bg = (35, 35, 42) if highlight else CARD_BG
    rounded_rect(draw, (x, y, x+700, y+64), fill=bg, outline=BORDER if highlight else None)
    draw.text((x+16, y+8), sender, font=FONT_S, fill=WHITE)
    draw.text((x+16, y+32), subject, font=FONT_XS, fill=GRAY)
    draw.text((x+440, y+8), code, font=FONT_XS, fill=INDIGO)
    tw = draw_tag(draw, x+440, y+34, status_text, status_color,
                  BLUE_BG if status_color == BLUE else
                  (20, 50, 20) if status_color == GREEN else
                  ORANGE_BG)


# ══════════════════════════════════════════════════════
# GIF 1: AI 自動收信歸檔
# ══════════════════════════════════════════════════════
def gif1_auto_filing():
    frames = []

    emails_data = [
        ("智慧財產局", "發明專利核准審定書", "MTKE23005PUS", "OA答辯"),
        ("USPTO", "Non-Final Office Action", "TSMC23014PUS", "OA答辯"),
        ("EPO", "Rule 71(3) Communication", "EPPA23801EP1", "核准通知"),
    ]

    attachments = [
        "MTKE23005PUS_核准審定書_2026-03-19.pdf",
        "TSMC23014PUS_OA_NonFinal_2026-03-19.pdf",
        "EPPA23801EP1_R71_Communication.pdf",
    ]

    drive_folders = [
        "📁 聯發科技/MTKE23005/官方來文/",
        "📁 台積電/TSMC23014/Office Actions/",
        "📁 European Client C/EPPA23801/Communications/",
    ]

    total_steps = 28

    for step in range(total_steps):
        img = Image.new("RGB", (W, H), BG)
        draw = ImageDraw.Draw(img)
        draw_header(draw, "AI 自動收信歸檔")

        # Title
        draw.text((40, 76), "📬 今日新收官方來文", font=FONT_L, fill=WHITE)
        draw.text((340, 84), "3 封待處理", font=FONT_S, fill=GRAY)

        # Left panel - email list
        draw_card(draw, 30, 120, 720, 560)

        for i, (sender, subject, code, tag) in enumerate(emails_data):
            ey = 140 + i * 80

            # Determine state for this email
            email_step = step - (i * 6)  # stagger each email

            if email_step < 0:
                # Not started yet
                draw_email_row(draw, 45, ey, sender, subject, code, "新收", ORANGE)
            elif email_step < 2:
                # Scanning
                draw_email_row(draw, 45, ey, sender, subject, code, "AI 辨識中...", BLUE, highlight=True)
                # Scanning animation
                scan_y = ey + 10 + (email_step * 25)
                draw.line((50, scan_y, 740, scan_y), fill=(*INDIGO, 128), width=2)
            elif email_step < 4:
                # Identified
                draw_email_row(draw, 45, ey, sender, subject, "✓ " + code, "已辨識", GREEN, highlight=True)
            else:
                # Done
                draw_email_row(draw, 45, ey, sender, subject, "✓ " + code, "已歸檔", GREEN)
                draw_check(draw, 720, ey + 20, done=True)

        # Right panel - processing details
        draw_card(draw, 770, 120, 400, 560)
        draw.text((790, 140), "🤖 AI 處理進度", font=FONT_M, fill=WHITE)

        # Progress for current email
        current_email = min(step // 6, 2)

        for i in range(3):
            py = 185 + i * 120
            email_step = step - (i * 6)

            draw.text((790, py), f"信件 {i+1}: {emails_data[i][2]}", font=FONT_S, fill=WHITE if email_step >= 0 else GRAY)

            if email_step >= 0:
                # Step indicators
                steps_labels = ["辨識收發碼", "下載附件", "重新命名", "歸檔"]
                for si, sl in enumerate(steps_labels):
                    sx = 790 + si * 95
                    done = email_step > si + 1
                    active = email_step == si + 1
                    color = GREEN if done else ACCENT if active else GRAY
                    draw.text((sx, py + 28), sl, font=FONT_XS, fill=color)
                    if done:
                        draw.text((sx - 2, py + 26), "✓", font=FONT_XS, fill=GREEN)

                if email_step >= 3:
                    draw.text((790, py + 52), f"📎 {attachments[i]}", font=FONT_XS, fill=LIGHT)
                if email_step >= 5:
                    draw.text((790, py + 72), f"→ {drive_folders[i]}", font=FONT_XS, fill=GREEN)

        # Bottom progress
        progress = min(step / (total_steps - 4), 1.0)
        draw.text((790, 560), f"總進度 {int(progress*100)}%", font=FONT_S, fill=WHITE)
        draw_progress_bar(draw, 790, 590, 360, progress, GREEN)

        if step >= total_steps - 4:
            # Final summary
            rounded_rect(draw, (790, 620, 1150, 660), fill=(20, 50, 20), radius=8)
            draw.text((810, 628), "✅ 3 封信件全部自動歸檔完成", font=FONT_S, fill=GREEN)

        frames.append(img)

    # Hold last frame
    for _ in range(12):
        frames.append(frames[-1])

    return frames


# ══════════════════════════════════════════════════════
# GIF 2: 人工確認 + LLM 學習
# ══════════════════════════════════════════════════════
def gif2_human_confirm_llm():
    frames = []
    total_steps = 35

    for step in range(total_steps):
        img = Image.new("RGB", (W, H), BG)
        draw = ImageDraw.Draw(img)
        draw_header(draw, "人工確認 → AI 學習")

        # Title
        draw.text((40, 76), "⚠️ AI 無法辨識 — 需人工確認", font=FONT_L, fill=ORANGE)

        # Left: email detail
        draw_card(draw, 30, 120, 540, 560)

        # Email content
        draw.text((50, 140), "寄件者：patent@example-firm.com", font=FONT_S, fill=GRAY)
        draw.text((50, 168), "主旨：RE: Case Update - ABCD12345", font=FONT_S, fill=WHITE)
        draw.text((50, 200), "附件：draft_response_v2_final.docx", font=FONT_XS, fill=LIGHT)

        # AI confusion box
        rounded_rect(draw, (50, 240, 550, 330), fill=ORANGE_BG, radius=8)
        draw.text((70, 252), "🤖 AI 判斷", font=FONT_S, fill=ORANGE)
        draw.text((70, 278), "無法確定收發碼：可能是 ABCD12345 或 ABCD12346", font=FONT_XS, fill=LIGHT)
        draw.text((70, 300), "信心度：42%  原因：案號格式不符已知規則", font=FONT_XS, fill=GRAY)

        # Human action area
        if step >= 3:
            rounded_rect(draw, (50, 345, 550, 560), fill=(30, 30, 38), radius=8)
            draw.text((70, 358), "👤 人工確認", font=FONT_M, fill=WHITE)

            # Assign person
            if step >= 5:
                draw.text((70, 395), "指派人員", font=FONT_XS, fill=GRAY)
                rounded_rect(draw, (70, 415, 300, 445), fill=(40, 40, 48), radius=6, outline=ACCENT if step == 5 else BORDER)
                draw.text((85, 420), "陳建志 · 專利師", font=FONT_XS, fill=WHITE)

            # Correct code
            if step >= 8:
                draw.text((70, 460), "正確收發碼", font=FONT_XS, fill=GRAY)
                rounded_rect(draw, (70, 480, 300, 510), fill=(40, 40, 48), radius=6, outline=ACCENT if step == 8 else BORDER)
                typing_text = "ABCD12345"[:min(len("ABCD12345"), max(0, (step-8)*2))]
                draw.text((85, 485), typing_text + ("│" if step < 13 else ""), font=FONT_XS, fill=WHITE)

            # Rename file
            if step >= 13:
                draw.text((70, 525), "檔案重新命名", font=FONT_XS, fill=GRAY)
                rounded_rect(draw, (70, 545, 540, 575), fill=(40, 40, 48), radius=6, outline=BORDER)
                draw.text((85, 550), "ABCD12345_OA答辯草稿_v2_2026-03-19.docx", font=FONT_XS, fill=WHITE)

            # Reason
            if step >= 15:
                draw.text((320, 395), "確認原因", font=FONT_XS, fill=GRAY)
                rounded_rect(draw, (320, 415, 540, 510), fill=(40, 40, 48), radius=6, outline=ACCENT if step == 15 else BORDER)
                reason_lines = [
                    "此事務所習慣在主旨",
                    "用 Case Update 開頭，",
                    "實際案號在附件檔名",
                ]
                for ri, rl in enumerate(reason_lines[:min(3, max(0, step-15))]):
                    draw.text((335, 422 + ri*20), rl, font=FONT_XS, fill=LIGHT)

        # Right panel: LLM learning
        draw_card(draw, 590, 120, 580, 560)
        draw.text((610, 140), "🧠 LLM 學習迴路", font=FONT_M, fill=INDIGO)

        if step >= 18:
            # Submit button flash
            if step == 18:
                rounded_rect(draw, (70, 620, 250, 655), fill=ACCENT, radius=8)
                draw.text((100, 627), "✓ 確認送出", font=FONT_S, fill=WHITE)

        if step >= 19:
            # Step 1: data sent
            draw.text((610, 180), "① 人工確認資料已送出", font=FONT_S, fill=GREEN)
            draw_check(draw, 1120, 180)

        if step >= 21:
            # Step 2: LLM processing
            processing = step < 25
            draw.text((610, 220), "② LLM 分析確認原因...", font=FONT_S, fill=BLUE if processing else GREEN)
            if processing:
                dots = "." * ((step - 21) % 4)
                draw.text((850, 220), dots, font=FONT_S, fill=BLUE)
            else:
                draw_check(draw, 1120, 220)

        if step >= 25:
            # Step 3: New rule generated
            draw.text((610, 260), "③ 產生新規則", font=FONT_S, fill=GREEN)
            draw_check(draw, 1120, 260)

            # Rule card
            rounded_rect(draw, (620, 295, 1150, 430), fill=INDIGO_BG, radius=8)
            draw.text((640, 308), "📋 新規則 #R-2026-0047", font=FONT_S, fill=INDIGO)
            draw.text((640, 340), "觸發條件：", font=FONT_XS, fill=GRAY)
            draw.text((740, 340), "主旨含 'Case Update' + 來自 *@example-firm.com", font=FONT_XS, fill=LIGHT)
            draw.text((640, 365), "動作：", font=FONT_XS, fill=GRAY)
            draw.text((740, 365), "從附件檔名提取案號（第一段英數字組合）", font=FONT_XS, fill=LIGHT)
            draw.text((640, 390), "信心度：", font=FONT_XS, fill=GRAY)
            draw.text((740, 390), "85% → 自動執行（下次無需人工確認）", font=FONT_XS, fill=GREEN)

        if step >= 28:
            # Step 4: applied
            draw.text((610, 450), "④ 規則已套用至系統", font=FONT_S, fill=GREEN)
            draw_check(draw, 1120, 450)

            # Stats
            rounded_rect(draw, (620, 485, 1150, 560), fill=(20, 50, 20), radius=8)
            draw.text((640, 498), "📊 學習成效", font=FONT_S, fill=GREEN)
            draw.text((640, 525), "本月 AI 學習: 12 條新規則  |  人工確認減少 34%  |  準確率 94% → 97%", font=FONT_XS, fill=LIGHT)

        if step >= 30:
            # Future prediction
            rounded_rect(draw, (620, 575, 1150, 650), fill=(25, 25, 50), radius=8)
            draw.text((640, 588), "🔮 預測", font=FONT_S, fill=ACCENT)
            draw.text((640, 615), "同來源信件下次將自動處理（無需人工）", font=FONT_XS, fill=LIGHT)
            draw.text((640, 638), "預估節省: 每封 3 分鐘 × 月均 15 封 = 45 分鐘/月", font=FONT_XS, fill=YELLOW)

        frames.append(img)

    for _ in range(12):
        frames.append(frames[-1])

    return frames


# ══════════════════════════════════════════════════════
# GIF 3: 管控中心
# ══════════════════════════════════════════════════════
def gif3_control_center():
    frames = []
    total_steps = 30

    rules = [
        ("R-2026-0001", "TIPO 核准通知自動歸檔", "AI 學習", "啟用", GREEN, "準確率 99.2%"),
        ("R-2026-0012", "USPTO OA 自動辨識收發碼", "AI 學習", "啟用", GREEN, "準確率 97.8%"),
        ("R-2026-0023", "EPO R71(3) 通知 → 核准標籤", "手動建立", "啟用", GREEN, "準確率 100%"),
        ("R-2026-0031", "年費催繳 → 自動提醒負責人", "AI 學習", "啟用", GREEN, "準確率 95.1%"),
        ("R-2026-0038", "韓國 KIPO OA 格式辨識", "AI 學習", "測試中", YELLOW, "準確率 82.3%"),
        ("R-2026-0047", "Case Update 主旨案號提取", "AI 學習", "新建", BLUE, "準確率 85.0%"),
    ]

    staff = [
        ("陳建志", "專利師", "42 件", "98%", GREEN),
        ("黃怡君", "專利師", "38 件", "97%", GREEN),
        ("林筱婷", "行政主管", "15 件", "100%", GREEN),
        ("張明宏", "專利工程師", "28 件", "95%", GREEN),
        ("王小美", "助理", "22 件", "94%", YELLOW),
        ("李大偉", "實習生", "8 件", "88%", ORANGE),
    ]

    for step in range(total_steps):
        img = Image.new("RGB", (W, H), BG)
        draw = ImageDraw.Draw(img)
        draw_header(draw, "管控中心")

        # Tab bar
        tabs = ["分類規則", "人員管理", "處理統計"]
        active_tab = 0 if step < 15 else 1 if step < 24 else 2

        for ti, tab in enumerate(tabs):
            tx = 40 + ti * 160
            is_active = ti == active_tab
            color = WHITE if is_active else GRAY
            draw.text((tx, 76), tab, font=FONT_M, fill=color)
            if is_active:
                draw.line((tx, 104, tx + 80, 104), fill=ACCENT, width=3)

        if active_tab == 0:
            # Rules tab
            draw.text((40, 120), f"📋 已建立規則 {min(step+1, 6)} 條", font=FONT_S, fill=WHITE)
            draw.text((280, 122), "AI 學習 4 | 手動 1 | 測試中 1", font=FONT_XS, fill=GRAY)

            # Rules table header
            y = 155
            draw.text((55, y), "規則 ID", font=FONT_XS, fill=GRAY)
            draw.text((210, y), "描述", font=FONT_XS, fill=GRAY)
            draw.text((600, y), "來源", font=FONT_XS, fill=GRAY)
            draw.text((750, y), "狀態", font=FONT_XS, fill=GRAY)
            draw.text((880, y), "準確率", font=FONT_XS, fill=GRAY)
            draw.text((1020, y), "操作", font=FONT_XS, fill=GRAY)
            draw.line((40, y+22, W-40, y+22), fill=BORDER, width=1)

            for i, (rid, desc, source, status, scolor, acc) in enumerate(rules):
                if i > min(step, 5):
                    break
                ry = 190 + i * 48
                highlight = (step >= 12 and i == 5)  # highlight newest rule

                if highlight:
                    rounded_rect(draw, (38, ry-5, W-38, ry+40), fill=(30, 30, 55), radius=6)

                draw.text((55, ry+5), rid, font=FONT_XS, fill=INDIGO)
                draw.text((210, ry+5), desc, font=FONT_XS, fill=WHITE)

                src_color = ACCENT if source == "AI 學習" else GRAY
                draw_tag(draw, 600, ry+3, source, src_color, INDIGO_BG if source == "AI 學習" else (40, 40, 45))

                draw_tag(draw, 750, ry+3, status, scolor,
                         (20, 50, 20) if scolor == GREEN else
                         (50, 45, 10) if scolor == YELLOW else BLUE_BG)

                draw.text((880, ry+5), acc, font=FONT_XS, fill=scolor)

                # Action buttons
                draw.text((1020, ry+5), "編輯", font=FONT_XS, fill=BLUE)
                draw.text((1070, ry+5), "停用", font=FONT_XS, fill=GRAY)
                if highlight:
                    draw.text((1120, ry+5), "⬅ 新", font=FONT_XS, fill=YELLOW)

        elif active_tab == 1:
            # Staff tab
            draw.text((40, 120), "👥 事務所人員", font=FONT_S, fill=WHITE)
            draw.text((220, 122), "6 人 · 3 專利師 · 1 行政 · 1 工程師 · 1 助理", font=FONT_XS, fill=GRAY)

            y = 155
            draw.text((55, y), "姓名", font=FONT_XS, fill=GRAY)
            draw.text((200, y), "職位", font=FONT_XS, fill=GRAY)
            draw.text((380, y), "負責案件", font=FONT_XS, fill=GRAY)
            draw.text((500, y), "處理準確率", font=FONT_XS, fill=GRAY)
            draw.text((650, y), "本週工作量", font=FONT_XS, fill=GRAY)
            draw.text((900, y), "操作", font=FONT_XS, fill=GRAY)
            draw.line((40, y+22, W-40, y+22), fill=BORDER, width=1)

            for i, (name, role, cases, acc, acolor) in enumerate(staff):
                si = step - 15
                if i > si:
                    break
                sy = 190 + i * 55

                # Avatar circle
                colors = [BLUE, INDIGO, GREEN, ORANGE, ACCENT, RED]
                draw.ellipse((55, sy+5, 80, sy+30), fill=colors[i])
                draw.text((60, sy+8), name[0], font=FONT_XS, fill=WHITE)

                draw.text((90, sy+8), name, font=FONT_S, fill=WHITE)
                draw.text((200, sy+10), role, font=FONT_XS, fill=GRAY)
                draw.text((380, sy+10), cases, font=FONT_XS, fill=LIGHT)
                draw.text((500, sy+10), acc, font=FONT_XS, fill=acolor)

                # Workload bar
                workload = float(cases.replace(" 件", "")) / 50
                draw_progress_bar(draw, 650, sy+15, 200, workload, acolor)

                draw.text((900, sy+10), "查看詳情", font=FONT_XS, fill=BLUE)

        else:
            # Stats tab
            draw.text((40, 120), "📊 處理統計（本月）", font=FONT_S, fill=WHITE)

            # Stat cards
            stats_data = [
                ("收件總數", "347", "封", GREEN),
                ("AI 自動處理", "312", "封 (90%)", GREEN),
                ("人工確認", "35", "封 (10%)", ORANGE),
                ("新增規則", "12", "條", INDIGO),
            ]

            for i, (label, value, unit, color) in enumerate(stats_data):
                sx = 40 + i * 285
                draw_card(draw, sx, 155, 265, 100)
                draw.text((sx+20, 168), label, font=FONT_XS, fill=GRAY)
                draw.text((sx+20, 195), value, font=FONT_L, fill=color)
                draw.text((sx+20 + len(value)*20, 205), unit, font=FONT_XS, fill=GRAY)

            # Trend
            draw_card(draw, 40, 275, 1120, 250)
            draw.text((60, 290), "AI 自動處理率趨勢", font=FONT_S, fill=WHITE)

            months = ["10月", "11月", "12月", "1月", "2月", "3月"]
            rates = [0.72, 0.78, 0.83, 0.87, 0.89, 0.90]

            anim_progress = min((step - 24) / 5, 1.0) if step >= 24 else 0

            for i in range(len(months)):
                month = months[i]
                rate = rates[i]
                bx = 100 + i * 170
                if i / 6 > anim_progress:
                    break
                bar_h = int(rate * 180)
                bar_color = GREEN if rate >= 0.85 else BLUE if rate >= 0.8 else ORANGE
                rounded_rect(draw, (bx, 490 - bar_h, bx + 80, 490), fill=bar_color, radius=6)
                draw.text((bx + 20, 498), month, font=FONT_XS, fill=GRAY)
                draw.text((bx + 15, 490 - bar_h - 22), f"{int(rate*100)}%", font=FONT_XS, fill=bar_color)

            # Bottom summary
            if step >= 28:
                rounded_rect(draw, (40, 545, 1160, 590), fill=(20, 50, 20), radius=8)
                draw.text((60, 555), "✅ 本月 AI 處理率 90%，較上月提升 1%。人工確認減少 34%，預計下月可達 93%。", font=FONT_S, fill=GREEN)

        frames.append(img)

    for _ in range(12):
        frames.append(frames[-1])

    return frames


# ══════════════════════════════════════════════════════
# Generate all GIFs
# ══════════════════════════════════════════════════════
if __name__ == "__main__":
    print("Generating GIF 1: AI 自動收信歸檔...")
    frames1 = gif1_auto_filing()
    frames1[0].save(
        os.path.join(OUT_DIR, "01_auto_filing.gif"),
        save_all=True, append_images=frames1[1:],
        duration=FRAME_DURATION, loop=0
    )
    print(f"  → 01_auto_filing.gif ({len(frames1)} frames)")

    print("Generating GIF 2: 人工確認 + LLM 學習...")
    frames2 = gif2_human_confirm_llm()
    frames2[0].save(
        os.path.join(OUT_DIR, "02_human_confirm_llm.gif"),
        save_all=True, append_images=frames2[1:],
        duration=FRAME_DURATION, loop=0
    )
    print(f"  → 02_human_confirm_llm.gif ({len(frames2)} frames)")

    print("Generating GIF 3: 管控中心...")
    frames3 = gif3_control_center()
    frames3[0].save(
        os.path.join(OUT_DIR, "03_control_center.gif"),
        save_all=True, append_images=frames3[1:],
        duration=FRAME_DURATION, loop=0
    )
    print(f"  → 03_control_center.gif ({len(frames3)} frames)")

    print("\nDone! All GIFs saved to:", OUT_DIR)
