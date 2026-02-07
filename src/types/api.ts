// Interface contracts for the API layer

export interface ApiResponse<T> {
  data: T
  cached: boolean
}

export interface ApiError {
  error: {
    code: string
    message: string
  }
}
