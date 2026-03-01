/**
 * API 客户端基础封装
 * 提供统一的 fetch wrapper，包含错误处理和 JSON 解析
 */

/** API 基础路径 — 开发模式下通过 Vite proxy 转发 */
const BASE_URL = '';

/** API 响应标准格式 */
interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
}

/** API 错误类 */
export class ApiError extends Error {
    statusCode: number;
    responseBody?: unknown;

    constructor(
        message: string,
        statusCode: number,
        responseBody?: unknown
    ) {
        super(message);
        this.name = 'ApiError';
        this.statusCode = statusCode;
        this.responseBody = responseBody;
    }
}

/**
 * 通用 API 请求函数
 * @param endpoint - 请求路径（如 '/api/logs'）
 * @param options - fetch 选项
 * @returns 解析后的 JSON 数据
 */
export async function apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<ApiResponse<T>> {
    const url = `${BASE_URL}${endpoint}`;

    // 设置默认请求头
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...((options.headers as Record<string, string>) || {}),
    };

    try {
        const response = await fetch(url, {
            ...options,
            headers,
        });

        // 解析 JSON 响应
        const data = await response.json();

        // 处理非 2xx 响应
        if (!response.ok) {
            throw new ApiError(
                data.error || `请求失败: ${response.status}`,
                response.status,
                data
            );
        }

        return data as ApiResponse<T>;
    } catch (error) {
        // 如果已经是 ApiError，直接抛出
        if (error instanceof ApiError) {
            throw error;
        }

        // 网络错误或其他异常
        throw new ApiError(
            error instanceof Error ? error.message : '网络请求失败',
            0
        );
    }
}

/**
 * GET 请求封装
 */
export async function apiGet<T>(endpoint: string): Promise<ApiResponse<T>> {
    return apiRequest<T>(endpoint, { method: 'GET' });
}

/**
 * POST 请求封装
 */
export async function apiPost<T>(
    endpoint: string,
    body: unknown
): Promise<ApiResponse<T>> {
    return apiRequest<T>(endpoint, {
        method: 'POST',
        body: JSON.stringify(body),
    });
}

/**
 * PUT 请求封装
 */
export async function apiPut<T>(
    endpoint: string,
    body: unknown
): Promise<ApiResponse<T>> {
    return apiRequest<T>(endpoint, {
        method: 'PUT',
        body: JSON.stringify(body),
    });
}

/**
 * DELETE 请求封装
 */
export async function apiDelete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return apiRequest<T>(endpoint, { method: 'DELETE' });
}

// ========== 服务账号管理 API ==========

/** 服务账号状态数据 */
export interface ServiceAccountStatus {
    project_id?: string;
    client_email?: string;
    type?: string;
    status: 'configured' | 'not_configured';
}

/** 获取服务账号状态 */
export async function getServiceAccount(): Promise<ApiResponse<ServiceAccountStatus>> {
    return apiGet<ServiceAccountStatus>('/api/service-account');
}

/** 上传服务账号 JSON */
export async function uploadServiceAccount(
    serviceAccountJson: Record<string, unknown>
): Promise<ApiResponse<ServiceAccountStatus>> {
    return apiPost<ServiceAccountStatus>('/api/service-account', serviceAccountJson);
}

/** 删除服务账号 */
export async function deleteServiceAccount(): Promise<ApiResponse<void>> {
    return apiDelete<void>('/api/service-account');
}

// ========== 系统配置 API ==========

/** 系统配置数据 */
export interface SystemConfig {
    monthly_budget: number;
}

/** 获取系统配置 */
export async function getSystemConfig(): Promise<ApiResponse<SystemConfig>> {
    return apiGet<SystemConfig>('/api/config');
}

/** 更新系统配置 */
export async function updateSystemConfig(
    config: Partial<SystemConfig>
): Promise<ApiResponse<Record<string, string>>> {
    return apiPut<Record<string, string>>('/api/config', config);
}

// ========== 日志查询 API ==========

/** 日志条目 */
export interface LogEntry {
    id: number;
    request_id: string;
    timestamp: string;
    prompt?: string;
    model: string;
    size?: string;
    aspect_ratio?: string;
    status: string;
    status_code?: number;
    error_message?: string;
    response_time_ms?: number;
    retry_count: number;
    retry_details?: string;
    estimated_cost?: number;
}

/** 日志分页响应 */
export interface LogsPageData {
    items: LogEntry[];
    total: number;
    page: number;
    page_size: number;
}

/** 日志查询参数 */
export interface LogQueryParams {
    page?: number;
    page_size?: number;
    start_date?: string;
    end_date?: string;
    status?: string;
}

/** 查询日志 */
export async function getLogs(params: LogQueryParams = {}): Promise<ApiResponse<LogsPageData>> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', String(params.page));
    if (params.page_size) searchParams.set('page_size', String(params.page_size));
    if (params.start_date) searchParams.set('start_date', params.start_date);
    if (params.end_date) searchParams.set('end_date', params.end_date);
    if (params.status) searchParams.set('status', params.status);

    const qs = searchParams.toString();
    return apiGet<LogsPageData>(`/api/logs${qs ? '?' + qs : ''}`);
}

// ========== 统计 API ==========

/** 月度统计数据 */
export interface StatsData {
    /** 总调用次数 */
    total_calls: number;
    /** 成功调用次数 */
    successful_calls: number;
    /** 失败调用次数 */
    failed_calls: number;
    /** 成功率（百分比 0-100） */
    success_rate: number;
    /** 总费用估算（USD） */
    total_cost: number;
    /** 月度预算（USD） */
    monthly_budget: number;
    /** 预算剩余（USD） */
    budget_remaining: number;
    /** 查询月份 */
    month: string;
    /** 是否为估算值 */
    is_estimate: boolean;
}

/** 获取月度统计 */
export async function getStats(month?: string): Promise<ApiResponse<StatsData>> {
    const qs = month ? `?month=${month}` : '';
    return apiGet<StatsData>(`/api/stats${qs}`);
}

// ========== 任务 API ==========

/** 任务条目 */
export interface TaskEntry {
    id: number;
    request_id: string;
    prompt: string;
    model: string;
    aspect_ratio?: string;
    image_filename: string;
    file_size?: number;
    created_at: string;
}

/** 任务分页响应 */
export interface TasksPageData {
    items: TaskEntry[];
    total: number;
    page: number;
    page_size: number;
}

/** 任务查询参数 */
export interface TaskQueryParams {
    page?: number;
    page_size?: number;
}

/** 查询任务列表 */
export async function getTasks(params: TaskQueryParams = {}): Promise<ApiResponse<TasksPageData>> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', String(params.page));
    if (params.page_size) searchParams.set('page_size', String(params.page_size));

    const qs = searchParams.toString();
    return apiGet<TasksPageData>(`/api/tasks${qs ? '?' + qs : ''}`);
}

/** 获取任务图片的 URL（预览） */
export function getTaskImageUrl(taskId: number): string {
    return `${BASE_URL}/api/tasks/${taskId}/image`;
}

/** 获取任务图片的下载 URL */
export function getTaskImageDownloadUrl(taskId: number): string {
    return `${BASE_URL}/api/tasks/${taskId}/image?download=1`;
}
