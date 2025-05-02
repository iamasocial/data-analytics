PROTO_DIR=proto
GO_OUT=go-server/generated
PYTHON_OUT=python-server

PROTOC=protoc
PROTO_FILE=$(PROTO_DIR)/analysis.proto

GO_GENERATE_CMD=$(PROTOC) --go_out=. --go-grpc_out=. $(PROTO_FILE)
PYTHON_GENERATE_CMD=venv/bin/python -m grpc_tools.protoc -I$(PROTO_DIR) --python_out=$(PYTHON_OUT) --pyi_out=$(PYTHON_OUT) --grpc_python_out=$(PYTHON_OUT) $(PROTO_FILE)

all: generate-go generate-python

generate-go:
	@echo "Generating Go files from proto..."
	@$(GO_GENERATE_CMD)

generate-python:
	@echo "Generating Python files from proto..."
	@$(PYTHON_GENERATE_CMD)

clean-go:
	@echo "Cleaning generated files..."
	@rm -rf $(GO_OUT)/*.pb.go

clean-python:
	@echo "Cleaning python generated files..."
	@rm -rf $(PYTHON_OUT)/*.py