class ApiResponse {
  constructor(data, message = "") {
    this.status = "success";
    this.data = data || null;
    this.message = message
  }
}

export { ApiResponse };
