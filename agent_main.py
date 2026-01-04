import sys
from src.agent import BenchmarkAgent

def main():
    print("Initializing Benchmark Agent...")
    try:
        agent_wrapper = BenchmarkAgent()
    except Exception as e:
        print(f"Error initializing agent: {e}")
        return

    print(f"Agent Ready! (Model: {agent_wrapper.model_id})")
    print("Type 'exit' to quit.")

    while True:
        try:
            user_input = input("\nUser: ")
            if user_input.lower() in ["exit", "quit"]:
                break
            
            print("\nAgent:")
            agent_wrapper.run(user_input)
            
        except KeyboardInterrupt:
            break
        except Exception as e:
            print(f"\nError: {e}")

if __name__ == "__main__":
    main()
