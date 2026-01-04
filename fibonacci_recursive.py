def fibonacci(n):
    """Calculate the nth Fibonacci number recursively."""
    if n <= 0:
        return 0
    elif n == 1:
        return 1
    else:
        return fibonacci(n-1) + fibonacci(n-2)

# Calculate the 10th Fibonacci number
fib_10 = fibonacci(10)
print(f"The 10th Fibonacci number is: {fib_10}")