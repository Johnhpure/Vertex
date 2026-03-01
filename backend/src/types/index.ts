/**
 * 基础类型定义
 * 所有共享类型接口在此定义
 */

/** API 标准响应格式 */
export interface ApiResponse<T = unknown> {
    /** 是否成功 */
    success: boolean;
    /** 响应数据 */
    data?: T;
    /** 错误信息 */
    error?: string;
}

/** API 错误信息 */
export interface ApiError {
    /** 错误码 */
    code: string;
    /** 错误描述 */
    message: string;
    /** HTTP 状态码 */
    statusCode: number;
}

/** 请求日志条目（对应 logs 表完整记录） */
export interface LogEntry {
    /** 自增主键 */
    id: number;
    /** 唯一请求 ID */
    request_id: string;
    /** 请求时间戳 */
    timestamp: string;
    /** 请求提示词 */
    prompt?: string;
    /** 请求的模型名称 */
    model: string;
    /** 图片尺寸 */
    size?: string;
    /** 图片宽高比 */
    aspect_ratio?: string;
    /** 请求状态（success / error） */
    status: string;
    /** HTTP 状态码 */
    status_code?: number;
    /** 错误信息 */
    error_message?: string;
    /** 响应耗时（毫秒） */
    response_time_ms?: number;
    /** 重试次数 */
    retry_count: number;
    /** 重试详情（JSON） */
    retry_details?: string;
    /** 预估成本（USD） */
    estimated_cost?: number;
    /** 记录创建时间 */
    created_at: string;
}

/** 插入日志的参数（不含自增 id 和默认值字段） */
export interface InsertLogParams {
    /** 唯一请求 ID */
    request_id: string;
    /** 请求时间戳 */
    timestamp: string;
    /** 请求提示词 */
    prompt?: string;
    /** 请求的模型名称 */
    model: string;
    /** 图片尺寸 */
    size?: string;
    /** 图片宽高比 */
    aspect_ratio?: string;
    /** 请求状态 */
    status: string;
    /** HTTP 状态码 */
    status_code?: number;
    /** 错误信息 */
    error_message?: string;
    /** 响应耗时（毫秒） */
    response_time_ms?: number;
    /** 重试次数 */
    retry_count?: number;
    /** 重试详情（JSON） */
    retry_details?: string;
    /** 预估成本（USD） */
    estimated_cost?: number;
}

/** 日志查询过滤条件 */
export interface LogQueryFilters {
    /** 起始日期 */
    start_date?: string;
    /** 结束日期 */
    end_date?: string;
    /** 状态筛选 */
    status?: string;
    /** 页码（从 1 开始，默认 1） */
    page?: number;
    /** 每页条数（默认 20） */
    page_size?: number;
}

/** 分页查询结果 */
export interface PaginatedResult<T> {
    /** 当前页数据 */
    items: T[];
    /** 总记录数 */
    total: number;
}

/** 配置条目（数据库存储） */
export interface ConfigEntry {
    /** 配置键 */
    key: string;
    /** 配置值（可能加密） */
    value: string;
    /** 是否加密存储 */
    encrypted: boolean;
    /** 创建时间 */
    created_at: string;
    /** 更新时间 */
    updated_at: string;
}

/** 服务账号信息 */
export interface ServiceAccount {
    /** 唯一 ID */
    id: string;
    /** 显示别名 */
    alias: string;
    /** 加密后的凭证 JSON */
    encrypted_credentials: string;
    /** 关联的项目 ID */
    project_id: string;
    /** 区域 */
    location: string;
    /** 创建时间 */
    created_at: string;
    /** 更新时间 */
    updated_at: string;
}

/** 任务记录条目（对应 tasks 表完整记录） */
export interface TaskEntry {
    /** 自增主键 */
    id: number;
    /** 关联的请求 ID（与 logs 表关联） */
    request_id: string;
    /** 用户输入的 prompt */
    prompt: string;
    /** 使用的模型名称 */
    model: string;
    /** 图片宽高比 */
    aspect_ratio?: string;
    /** 图片分辨率（如 "1K"、"2K"、"4K"） */
    image_size?: string;
    /** 保存的图片文件路径（相对于 data/images/） */
    image_filename: string;
    /** 图片文件大小（字节） */
    file_size?: number;
    /** 记录创建时间 */
    created_at: string;
}

/** 插入任务的参数（不含自增 id 和默认值字段） */
export interface InsertTaskParams {
    /** 关联的请求 ID */
    request_id: string;
    /** 用户输入的 prompt */
    prompt: string;
    /** 使用的模型名称 */
    model: string;
    /** 图片宽高比 */
    aspect_ratio?: string;
    /** 图片分辨率（如 "1K"、"2K"、"4K"） */
    image_size?: string;
    /** 保存的图片文件名 */
    image_filename: string;
    /** 图片文件大小（字节） */
    file_size?: number;
}

/** 任务查询过滤条件 */
export interface TaskQueryFilters {
    /** 页码（从 1 开始，默认 1） */
    page?: number;
    /** 每页条数（默认 20） */
    page_size?: number;
}
