# logging.py
import logging
import os

# ===== 全局配置 =====
LOG_FOLDER = "logs"
os.makedirs(LOG_FOLDER, exist_ok=True)


def get_logger(name: str, level=logging.DEBUG, console_level=logging.INFO, file_level=logging.DEBUG):
    """
    获取统一的 logger
    name: logger 名称（一般用模块名或 AI 名）
    level: logger 总等级
    console_level: 控制台打印等级
    file_level: 文件打印等级
    """
    logger = logging.getLogger(name)
    logger.setLevel(level)
    if logger.hasHandlers():
        logger.handlers.clear()  # 避免重复添加 handler

    # 文件处理器
    log_file = os.path.join(LOG_FOLDER, f"{name}.log")
    fh = logging.FileHandler(log_file, encoding="utf-8")
    fh.setLevel(file_level)
    file_formatter = logging.Formatter('%(asctime)s [%(levelname)s] %(name)s: %(message)s')
    fh.setFormatter(file_formatter)
    logger.addHandler(fh)

    # 控制台处理器
    ch = logging.StreamHandler()
    ch.setLevel(console_level)
    console_formatter = logging.Formatter('[%(levelname)s] %(name)s: %(message)s')
    ch.setFormatter(console_formatter)
    logger.addHandler(ch)

    return logger
